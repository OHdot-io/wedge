import type { WebhookConfig, WebhookDraft } from "./types"

const EMPTY_WEBHOOK_DRAFT: WebhookDraft = {
  name: "",
  webhookUrl: "",
  authenticationToken: "",
  isDefault: true,
}

export function createEmptyWebhookDraft(makeDefault: boolean): WebhookDraft {
  return {
    ...EMPTY_WEBHOOK_DRAFT,
    isDefault: makeDefault,
  }
}

export function toWebhookDraft(webhook: WebhookConfig | null): WebhookDraft {
  if (!webhook) {
    return { ...EMPTY_WEBHOOK_DRAFT }
  }

  return {
    id: webhook.id,
    name: webhook.name,
    webhookUrl: webhook.webhookUrl,
    authenticationToken: webhook.authenticationToken,
    isDefault: webhook.isDefault,
  }
}
