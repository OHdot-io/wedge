import type {
  BuiltinFieldKey,
  CustomFieldType,
  MatrixFieldValue,
  PageSnapshot,
  WebhookField,
  WebhookFieldDraft,
  WebhookFieldValue,
  WebhookFormValues,
} from "./types"

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

type BuiltinFieldDefinition = {
  builtinKey: BuiltinFieldKey
  label: string
  key: string
  inputType: "short_text" | "long_text"
  description: string
}

export const BUILTIN_FIELD_DEFINITIONS: Record<BuiltinFieldKey, BuiltinFieldDefinition> = {
  url: {
    builtinKey: "url",
    label: "Page URL",
    key: "url",
    inputType: "short_text",
    description: "The active page URL.",
  },
  title: {
    builtinKey: "title",
    label: "Page title",
    key: "title",
    inputType: "short_text",
    description: "The current tab title.",
  },
  description: {
    builtinKey: "description",
    label: "Page description",
    key: "description",
    inputType: "long_text",
    description: "The page meta description when available.",
  },
  canonical_url: {
    builtinKey: "canonical_url",
    label: "Canonical URL",
    key: "canonical_url",
    inputType: "short_text",
    description: "The page canonical link when available.",
  },
  og_title: {
    builtinKey: "og_title",
    label: "Open Graph title",
    key: "og_title",
    inputType: "short_text",
    description: "The page og:title when available.",
  },
  selected_text: {
    builtinKey: "selected_text",
    label: "Selected text",
    key: "selected_text",
    inputType: "long_text",
    description: "The text currently selected on the page.",
  },
  hostname: {
    builtinKey: "hostname",
    label: "Hostname",
    key: "hostname",
    inputType: "short_text",
    description: "The active page hostname.",
  },
}

export const BUILTIN_FIELD_ORDER = Object.keys(
  BUILTIN_FIELD_DEFINITIONS
) as BuiltinFieldKey[]

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  number: "Number",
  email: "Email",
  phone: "Phone number",
  link: "URL",
  signature: "Electronic signature",
  multiple_choice: "Multiple choice",
  dropdown: "Select",
  checkbox: "Checkbox",
  multi_select: "Multi-select",
  matrix: "Matrix",
  date: "Date",
  time: "Time",
  rating: "Rating",
  linear_scale: "Linear scale",
  ranking: "Ranking",
}

export function createDefaultWebhookFields() {
  return [
    createBuiltinField("url"),
    createBuiltinField("title"),
    createBuiltinField("description"),
  ]
}

export function createBuiltinField(builtinKey: BuiltinFieldKey): WebhookFieldDraft {
  const template = BUILTIN_FIELD_DEFINITIONS[builtinKey]

  return {
    id: createId(),
    type: "builtin",
    builtinKey,
    key: template.key,
    label: template.label,
    required: builtinKey === "url",
  }
}

export function createCustomField(
  type: CustomFieldType,
  existingFields: WebhookField[]
): WebhookFieldDraft {
  const base = {
    id: createId(),
    key: getNextCustomFieldKey(existingFields, type),
    label: CUSTOM_FIELD_TYPE_LABELS[type],
    required: false,
  }

  switch (type) {
    case "short_text":
    case "long_text":
    case "number":
    case "email":
    case "phone":
    case "link":
    case "signature":
    case "date":
    case "time":
      return { ...base, type, defaultValue: "" }
    case "multiple_choice":
    case "dropdown":
      return {
        ...base,
        type,
        options: ["Option 1", "Option 2", "Option 3"],
        defaultValue: "",
      }
    case "checkbox":
      return { ...base, type, defaultValue: false }
    case "multi_select":
      return {
        ...base,
        type,
        options: ["Option 1", "Option 2", "Option 3"],
        defaultValue: [],
      }
    case "matrix":
      return {
        ...base,
        type,
        rows: ["Statement 1", "Statement 2"],
        columns: ["Strongly disagree", "Neutral", "Strongly agree"],
        defaultValue: {},
      }
    case "rating":
      return {
        ...base,
        type,
        max: 5,
        defaultValue: "",
      }
    case "linear_scale":
      return {
        ...base,
        type,
        min: 1,
        max: 5,
        minLabel: "Low",
        maxLabel: "High",
        defaultValue: "",
      }
    case "ranking":
      return {
        ...base,
        type,
        options: ["Option 1", "Option 2", "Option 3"],
        defaultValue: ["Option 1", "Option 2", "Option 3"],
      }
  }
}

export function getBuiltinFieldValue(builtinKey: BuiltinFieldKey, page: PageSnapshot) {
  switch (builtinKey) {
    case "url":
      return page.url
    case "title":
      return page.title
    case "description":
      return page.context.meta.description
    case "canonical_url":
      return page.context.meta.canonical || page.url
    case "og_title":
      return page.context.meta.ogTitle || page.title
    case "selected_text":
      return page.context.selectedText
    case "hostname":
      return page.hostname
  }
}

export function getFieldInputKind(field: WebhookField) {
  if (field.type === "builtin") {
    return BUILTIN_FIELD_DEFINITIONS[field.builtinKey].inputType
  }

  return field.type
}

export function getInitialValueForField(field: WebhookField, page: PageSnapshot): WebhookFieldValue {
  if (field.type === "builtin") {
    return getBuiltinFieldValue(field.builtinKey, page)
  }

  if (field.type === "checkbox") {
    return field.defaultValue
  }

  if (
    field.type === "multi_select" ||
    field.type === "ranking"
  ) {
    return [...field.defaultValue]
  }

  if (field.type === "matrix") {
    return { ...field.defaultValue }
  }

  return field.defaultValue
}

export function createInitialFormValues(fields: WebhookField[], page: PageSnapshot): WebhookFormValues {
  return Object.fromEntries(
    fields.map((field) => [field.id, getInitialValueForField(field, page)])
  )
}

export function buildPayloadFromValues(fields: WebhookField[], values: WebhookFormValues) {
  return Object.fromEntries(
    fields.map((field) => {
      const value = values[field.id]

      if (field.type === "checkbox") {
        return [field.key, typeof value === "boolean" ? value : false]
      }

      if (
        field.type === "multi_select" ||
        field.type === "ranking"
      ) {
        return [field.key, Array.isArray(value) ? value : []]
      }

      if (field.type === "matrix") {
        const matrixValue = isMatrixFieldValue(value) ? value : {}

        return [
          field.key,
          Object.fromEntries(
            field.rows.map((row) => [toSnakeCase(row), matrixValue[row] ?? ""])
          ),
        ]
      }

      if (
        field.type === "number" ||
        field.type === "rating" ||
        field.type === "linear_scale"
      ) {
        const normalizedValue = typeof value === "string" ? value.trim() : ""
        return [field.key, normalizedValue.length > 0 ? Number(normalizedValue) : ""]
      }

      return [field.key, typeof value === "string" ? value : ""]
    })
  )
}

export function validateWebhookForm(fields: WebhookField[], values: WebhookFormValues) {
  const errors: Record<string, string> = {}

  for (const field of fields) {
    if (!field.required) {
      continue
    }

    const value = values[field.id]

    if (field.type === "checkbox") {
      if (value !== true) {
        errors[field.id] = `${field.label} must be checked.`
      }
      continue
    }

    if (
      field.type === "multi_select" ||
      field.type === "ranking"
    ) {
      if (!Array.isArray(value) || value.length === 0) {
        errors[field.id] = `Select at least one option for ${field.label}.`
      }
      continue
    }

    if (field.type === "matrix") {
      const matrixValue = isMatrixFieldValue(value) ? value : {}
      const missingRow = field.rows.find((row) => !matrixValue[row] || matrixValue[row].trim().length === 0)

      if (missingRow) {
        errors[field.id] = `Complete every row in ${field.label}.`
      }
      continue
    }

    if (typeof value !== "string" || value.trim().length === 0) {
      errors[field.id] = `${field.label} is required.`
    }
  }

  return errors
}

export function getUnusedBuiltinKeys(fields: WebhookField[]) {
  const used = new Set(
    fields.filter((field) => field.type === "builtin").map((field) => field.builtinKey)
  )

  return BUILTIN_FIELD_ORDER.filter((builtinKey) => !used.has(builtinKey))
}

export function cloneFieldDraft(field: WebhookFieldDraft): WebhookFieldDraft {
  if (
    field.type === "multi_select" ||
    field.type === "ranking"
  ) {
    return {
      ...field,
      id: createId(),
      defaultValue: [...field.defaultValue],
      options: [...field.options],
    }
  }

  if (field.type === "multiple_choice" || field.type === "dropdown") {
    return {
      ...field,
      id: createId(),
      options: [...field.options],
    }
  }

  if (field.type === "matrix") {
    return {
      ...field,
      id: createId(),
      rows: [...field.rows],
      columns: [...field.columns],
      defaultValue: { ...field.defaultValue },
    }
  }

  return { ...field, id: createId() }
}

export function getFieldTypeLabel(field: WebhookField) {
  if (field.type === "builtin") {
    return "Built-in"
  }

  return CUSTOM_FIELD_TYPE_LABELS[field.type]
}

export function getNextCustomFieldKey(fields: WebhookField[], type: CustomFieldType) {
  const count = fields.filter((field) => field.type === type).length
  return `${type}_${count + 1}`
}

export function toSnakeCase(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function isMatrixFieldValue(value: WebhookFieldValue | undefined): value is MatrixFieldValue {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
