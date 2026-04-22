import type { ErrorCode, WebhookConfig } from "./types"

export interface BackgroundSuccess {
  ok: true
  requestId: string
  message: string
  responseSnippet?: string
}

export interface BackgroundFailure {
  ok: false
  error: string
  errorCode?: ErrorCode
  responseSnippet?: string
}

export type BackgroundResponse = BackgroundSuccess | BackgroundFailure

export type BackgroundRequest =
  | {
      type: "wedge/send"
      webhookId: string
      payload: Record<string, unknown>
      pageTitle?: string
      pageHostname?: string
    }
  | {
      type: "wedge/test-webhook"
      webhookId: string
    }

export interface DeliveryInput {
  webhook: WebhookConfig
  payload: Record<string, unknown>
  pageTitle?: string
  pageHostname?: string
}
