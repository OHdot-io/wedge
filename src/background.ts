import type { BackgroundRequest, BackgroundResponse, DeliveryInput } from "./lib/messages"
import {
  CLAY_WEBHOOK_AUTH_HEADER,
  getAppState,
  getHostname,
  markWebhookTestResult,
  markWebhookUsed,
  parseAndValidateUrl,
  pushHistory,
  randomId,
} from "./lib/storage"
import {
  buildPayloadFromValues,
  createInitialFormValues,
  validateWebhookForm,
} from "./lib/webhook-fields"
import type { ErrorCode, HistoryEntry, PageSnapshot, WebhookConfig } from "./lib/types"

const MENU_IDS = {
  SEND_PAGE: "wedge.sendPage",
  SEND_SELECTION: "wedge.sendSelection",
  SEND_LINK: "wedge.sendLink",
} as const

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_IDS.SEND_PAGE,
    title: "Wedge: Send Current Page",
    contexts: ["page"],
  })

  chrome.contextMenus.create({
    id: MENU_IDS.SEND_SELECTION,
    title: "Wedge: Send Selected Text",
    contexts: ["selection"],
  })

  chrome.contextMenus.create({
    id: MENU_IDS.SEND_LINK,
    title: "Wedge: Send Link URL",
    contexts: ["link"],
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { webhooks } = await getAppState()
  const webhook = webhooks.find((entry) => entry.isDefault) ?? webhooks[0]

  if (!webhook) {
    await pushHistory({
      id: randomId(),
      at: new Date().toISOString(),
      status: "error",
      webhookName: "(none)",
      message: "Add a webhook before using context menu sends.",
      context: String(info.menuItemId),
      errorCode: "CONFIG_MISSING",
      pageTitle: tab?.title ?? "",
      pageHostname: getHostname(info.linkUrl || tab?.url),
    })
    return
  }

  const page = buildContextMenuSnapshot(info, tab)
  const values = createInitialFormValues(webhook.fields, page)
  const fieldErrors = validateWebhookForm(webhook.fields, values)

  if (Object.keys(fieldErrors).length > 0) {
    await pushHistory(
      createHistoryEntry({
        webhook,
        status: "error",
        message: "This webhook requires extra fields, so it has to be sent from the popup.",
        pageTitle: page.title,
        pageHostname: page.hostname,
        requestId: randomId(),
        errorCode: "FIELD_REQUIRED",
      })
    )
    return
  }

  await deliverAndTrack({
    webhook,
    payload: buildPayloadFromValues(webhook.fields, values),
    pageTitle: page.title,
    pageHostname: page.hostname,
  }).catch(() => undefined)
})

chrome.runtime.onMessage.addListener((message: BackgroundRequest, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    return false
  }

  if (message.type === "wedge/send") {
    void handleSend(message).then(sendResponse)
    return true
  }

  if (message.type === "wedge/test-webhook") {
    void handleTestWebhook(message.webhookId).then(sendResponse)
    return true
  }

  return false
})

async function handleSend(
  message: Extract<BackgroundRequest, { type: "wedge/send" }>
): Promise<BackgroundResponse> {
  const { webhooks } = await getAppState()
  const webhook = webhooks.find((entry) => entry.id === message.webhookId)

  if (!webhook) {
    return {
      ok: false,
      error: "Select a valid webhook before sending.",
      errorCode: "CONFIG_MISSING",
    }
  }

  return deliverAndTrack({
    webhook,
    payload: message.payload,
    pageTitle: message.pageTitle,
    pageHostname: message.pageHostname,
  })
}

async function handleTestWebhook(webhookId: string): Promise<BackgroundResponse> {
  const { webhooks } = await getAppState()
  const webhook = webhooks.find((entry) => entry.id === webhookId)

  if (!webhook) {
    return {
      ok: false,
      error: "Save the webhook before testing it.",
      errorCode: "CONFIG_MISSING",
    }
  }

  const payload = {
    test: true,
    source: "wedge_settings_test",
    sentAt: new Date().toISOString(),
    webhookName: webhook.name,
  }

  const response = await deliverAndTrack({
    webhook,
    payload,
  })

  const now = new Date().toISOString()
  await markWebhookTestResult(webhookId, response.ok ? "success" : "error", now)
  return response
}

async function deliverAndTrack(input: DeliveryInput): Promise<BackgroundResponse> {
  const requestId = randomId()

  try {
    parseAndValidateUrl(input.webhook.webhookUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook URL."
    await pushHistory(
      createHistoryEntry({
        webhook: input.webhook,
        status: "error",
        message,
        payloadPreview: JSON.stringify(input.payload).slice(0, 500),
        pageTitle: input.pageTitle,
        pageHostname: input.pageHostname,
        requestId,
        errorCode: "URL_INVALID",
      })
    )
    return { ok: false, error: message, errorCode: "URL_INVALID" }
  }

  const body = JSON.stringify(input.payload)

  if (body.length > 1_000_000) {
    const message = "Payload is too large (over 1 MB). Reduce the data before sending."
    await pushHistory(
      createHistoryEntry({
        webhook: input.webhook,
        status: "error",
        message,
        payloadPreview: body.slice(0, 500),
        pageTitle: input.pageTitle,
        pageHostname: input.pageHostname,
        requestId,
        errorCode: "PAYLOAD_TOO_LARGE",
      })
    )
    return { ok: false, error: message, errorCode: "PAYLOAD_TOO_LARGE" }
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-wedge-request-id": requestId,
    }

    if (input.webhook.authenticationToken.trim().length > 0) {
      headers[CLAY_WEBHOOK_AUTH_HEADER] = input.webhook.authenticationToken.trim()
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    const response = await fetch(input.webhook.webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseSnippet = await readResponseSnippet(response, 200)

    if (!response.ok) {
      const message = `Webhook returned ${response.status}. Check the webhook URL and token.`
      await pushHistory(
        createHistoryEntry({
          webhook: input.webhook,
          status: "error",
          message,
          payloadPreview: body.slice(0, 500),
          pageTitle: input.pageTitle,
          pageHostname: input.pageHostname,
          requestId,
          errorCode: "HTTP_ERROR",
        })
      )
      return {
        ok: false,
        error: message,
        errorCode: "HTTP_ERROR",
        responseSnippet,
      }
    }

    const now = new Date().toISOString()
    await markWebhookUsed(input.webhook.id, now)
    await pushHistory(
      createHistoryEntry({
        webhook: input.webhook,
        status: "sent",
        message: "Sent successfully.",
        payloadPreview: body.slice(0, 500),
        pageTitle: input.pageTitle,
        pageHostname: input.pageHostname,
        requestId,
      })
    )

    return {
      ok: true,
      requestId,
      message: "Sent successfully.",
      responseSnippet,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? `Network error: ${error.message}`
        : "Network error while sending to the webhook."

    await pushHistory(
      createHistoryEntry({
        webhook: input.webhook,
        status: "error",
        message,
        payloadPreview: body.slice(0, 500),
        pageTitle: input.pageTitle,
        pageHostname: input.pageHostname,
        requestId,
        errorCode: "NETWORK_ERROR",
      })
    )

    return {
      ok: false,
      error: message,
      errorCode: "NETWORK_ERROR",
    }
  }
}

function buildContextMenuSnapshot(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): PageSnapshot {
  const url = info.linkUrl || tab?.url || ""

  return {
    url,
    title: tab?.title || "",
    hostname: getHostname(url),
    context: {
      selectedText: info.selectionText || "",
      meta: {
        description: "",
        canonical: url,
        ogTitle: tab?.title || "",
      },
    },
  }
}

async function readResponseSnippet(response: Response, maxBytes: number) {
  if (!response.body) {
    return ""
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let result = ""

  try {
    while (result.length < maxBytes) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
    }
  } finally {
    await reader.cancel()
  }

  return result.slice(0, maxBytes)
}

function createHistoryEntry({
  webhook,
  status,
  message,
  payloadPreview,
  pageTitle,
  pageHostname,
  requestId,
  errorCode,
}: {
  webhook: WebhookConfig
  status: HistoryEntry["status"]
  message: string
  payloadPreview?: string
  pageTitle?: string
  pageHostname?: string
  requestId: string
  errorCode?: ErrorCode
}): HistoryEntry {
  return {
    id: randomId(),
    at: new Date().toISOString(),
    status,
    webhookId: webhook.id,
    webhookName: webhook.name,
    payloadPreview,
    message,
    pageTitle,
    pageHostname,
    requestId,
    errorCode,
  }
}
