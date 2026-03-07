export type HistoryStatus = "sent" | "error"
export type TestStatus = "idle" | "success" | "error"
export type ErrorCode =
  | "CONFIG_MISSING"
  | "URL_INVALID"
  | "FIELD_REQUIRED"
  | "NETWORK_ERROR"
  | "HTTP_ERROR"
  | "PAYLOAD_TOO_LARGE"

export type BuiltinFieldKey =
  | "url"
  | "title"
  | "description"
  | "canonical_url"
  | "og_title"
  | "selected_text"
  | "hostname"

export type BasicFieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "email"
  | "phone"
  | "link"
  | "signature"
  | "date"
  | "time"

export type ChoiceSingleFieldType = "multiple_choice" | "dropdown"
export type ChoiceMultiFieldType = "multi_select"

export type CustomFieldType =
  | BasicFieldType
  | ChoiceSingleFieldType
  | ChoiceMultiFieldType
  | "checkbox"
  | "matrix"
  | "rating"
  | "linear_scale"
  | "ranking"

export interface BaseWebhookField {
  id: string
  key: string
  label: string
  required: boolean
}

export interface BuiltinWebhookField extends BaseWebhookField {
  type: "builtin"
  builtinKey: BuiltinFieldKey
}

export interface BasicWebhookField extends BaseWebhookField {
  type: BasicFieldType
  defaultValue: string
}

export interface ChoiceSingleWebhookField extends BaseWebhookField {
  type: ChoiceSingleFieldType
  options: string[]
  defaultValue: string
}

export interface ChoiceMultiWebhookField extends BaseWebhookField {
  type: ChoiceMultiFieldType
  options: string[]
  defaultValue: string[]
}

export interface CheckboxWebhookField extends BaseWebhookField {
  type: "checkbox"
  defaultValue: boolean
}

export interface MatrixWebhookField extends BaseWebhookField {
  type: "matrix"
  rows: string[]
  columns: string[]
  defaultValue: Record<string, string>
}

export interface RatingWebhookField extends BaseWebhookField {
  type: "rating"
  max: number
  defaultValue: string
}

export interface LinearScaleWebhookField extends BaseWebhookField {
  type: "linear_scale"
  min: number
  max: number
  minLabel: string
  maxLabel: string
  defaultValue: string
}

export interface RankingWebhookField extends BaseWebhookField {
  type: "ranking"
  options: string[]
  defaultValue: string[]
}

export type WebhookField =
  | BuiltinWebhookField
  | BasicWebhookField
  | ChoiceSingleWebhookField
  | ChoiceMultiWebhookField
  | CheckboxWebhookField
  | MatrixWebhookField
  | RatingWebhookField
  | LinearScaleWebhookField
  | RankingWebhookField

export type WebhookFieldDraft = WebhookField

export interface WebhookConfig {
  id: string
  name: string
  webhookUrl: string
  authenticationToken: string
  isDefault: boolean
  fields: WebhookField[]
  createdAt: string
  updatedAt: string
  lastTestedAt?: string
  lastTestStatus?: TestStatus
  lastUsedAt?: string
}

export interface HistoryEntry {
  id: string
  at: string
  status: HistoryStatus
  webhookId?: string
  webhookName: string
  payloadPreview?: string
  message: string
  context?: string
  pageTitle?: string
  pageHostname?: string
  requestId?: string
  errorCode?: ErrorCode
}

export interface UIState {
  lastSelectedWebhookId?: string
}

export interface PageContextMeta {
  description: string
  canonical: string
  ogTitle: string
}

export interface PageContext {
  selectedText: string
  meta: PageContextMeta
}

export interface PageSnapshot {
  url: string
  title: string
  hostname: string
  context: PageContext
}

export type MatrixFieldValue = Record<string, string>
export type WebhookFieldValue = string | boolean | string[] | MatrixFieldValue
export type WebhookFormValues = Record<string, WebhookFieldValue | undefined>

export interface AppState {
  webhooks: WebhookConfig[]
  history: HistoryEntry[]
  uiState: UIState
}

export interface Diagnostics {
  webhooksCount: number
  historyCount: number
  schemaVersion: number
  extensionVersion: string
}

export interface WebhookDraft {
  id?: string
  name: string
  webhookUrl: string
  authenticationToken: string
  isDefault: boolean
}
