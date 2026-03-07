import { z } from "zod"

import {
  BUILTIN_FIELD_DEFINITIONS,
  toSnakeCase,
} from "./webhook-fields"
import { parseAndValidateUrl, randomId } from "./storage"
import type {
  BasicFieldType,
  BuiltinFieldKey,
  ChoiceMultiFieldType,
  ChoiceSingleFieldType,
  WebhookConfig,
  WebhookDraft,
  WebhookField,
  WebhookFieldDraft,
} from "./types"

const BASIC_FIELD_TYPES = [
  "short_text",
  "long_text",
  "number",
  "email",
  "phone",
  "link",
  "signature",
  "date",
  "time",
] as const satisfies readonly BasicFieldType[]

const CHOICE_SINGLE_FIELD_TYPES = [
  "multiple_choice",
  "dropdown",
] as const satisfies readonly ChoiceSingleFieldType[]

const CHOICE_MULTI_FIELD_TYPES = [
  "multi_select",
] as const satisfies readonly ChoiceMultiFieldType[]

const BUILTIN_FIELD_KEYS = [
  "url",
  "title",
  "description",
  "canonical_url",
  "og_title",
  "selected_text",
  "hostname",
] as const satisfies readonly BuiltinFieldKey[]

const webhookDraftSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Enter a webhook name.")
    .max(80, "Keep the webhook name under 80 characters."),
  webhookUrl: z
    .string()
    .trim()
    .min(1, "Enter a webhook URL.")
    .max(2048, "Keep the webhook URL under 2048 characters."),
  authenticationToken: z
    .string()
    .trim()
    .max(2000, "Keep the authentication token under 2000 characters."),
  isDefault: z.boolean(),
})

const baseFieldSchema = z.object({
  id: z.string().min(1),
  key: z.string().trim().min(1, "Add a JSON key."),
  label: z.string().trim().min(1, "Add a field label."),
  required: z.boolean(),
})

const builtinFieldSchema = baseFieldSchema.extend({
  type: z.literal("builtin"),
  builtinKey: z.enum(BUILTIN_FIELD_KEYS),
})

const basicFieldSchema = baseFieldSchema.extend({
  type: z.enum(BASIC_FIELD_TYPES),
  defaultValue: z.string(),
})

const singleChoiceFieldSchema = baseFieldSchema.extend({
  type: z.enum(CHOICE_SINGLE_FIELD_TYPES),
  options: z
    .array(z.string().trim().min(1, "Option labels cannot be empty."))
    .min(1, "Add at least one option."),
  defaultValue: z.string(),
})

const multiChoiceFieldSchema = baseFieldSchema.extend({
  type: z.enum(CHOICE_MULTI_FIELD_TYPES),
  options: z
    .array(z.string().trim().min(1, "Option labels cannot be empty."))
    .min(1, "Add at least one option."),
  defaultValue: z.array(z.string()),
})

const checkboxFieldSchema = baseFieldSchema.extend({
  type: z.literal("checkbox"),
  defaultValue: z.boolean(),
})

const matrixFieldSchema = baseFieldSchema.extend({
  type: z.literal("matrix"),
  rows: z
    .array(z.string().trim().min(1, "Row labels cannot be empty."))
    .min(1, "Add at least one matrix row."),
  columns: z
    .array(z.string().trim().min(1, "Column labels cannot be empty."))
    .min(1, "Add at least one matrix column."),
  defaultValue: z.record(z.string(), z.string()),
})

const ratingFieldSchema = baseFieldSchema.extend({
  type: z.literal("rating"),
  max: z
    .number()
    .int("Rating must be a whole number.")
    .min(2, "Use at least 2 rating steps.")
    .max(10, "Keep ratings at 10 steps or fewer."),
  defaultValue: z.string(),
})

const linearScaleFieldSchema = baseFieldSchema.extend({
  type: z.literal("linear_scale"),
  min: z.number().int("Scale minimum must be a whole number."),
  max: z.number().int("Scale maximum must be a whole number."),
  minLabel: z.string(),
  maxLabel: z.string(),
  defaultValue: z.string(),
}).refine((value) => value.max > value.min, {
  message: "Scale maximum must be greater than the minimum.",
  path: ["max"],
})

const rankingFieldSchema = baseFieldSchema.extend({
  type: z.literal("ranking"),
  options: z
    .array(z.string().trim().min(1, "Option labels cannot be empty."))
    .min(2, "Add at least two ranking options."),
  defaultValue: z.array(z.string()),
})

const webhookFieldSchema = z.discriminatedUnion("type", [
  builtinFieldSchema,
  basicFieldSchema,
  singleChoiceFieldSchema,
  multiChoiceFieldSchema,
  checkboxFieldSchema,
  matrixFieldSchema,
  ratingFieldSchema,
  linearScaleFieldSchema,
  rankingFieldSchema,
])

const webhookConfigSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  webhookUrl: z.string().trim().min(1),
  authenticationToken: z.string(),
  isDefault: z.boolean(),
  fields: z.array(webhookFieldSchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastTestedAt: z.string().optional(),
  lastTestStatus: z.enum(["idle", "success", "error"]).optional(),
  lastUsedAt: z.string().optional(),
})

export type FieldErrors<T extends string> = Partial<Record<T, string>>

export function validateWebhookDraft(
  draft: WebhookDraft,
  existingWebhook?: WebhookConfig
) {
  const parsed = webhookDraftSchema.safeParse({
    ...draft,
    name: draft.name.trim(),
    webhookUrl: draft.webhookUrl.trim(),
    authenticationToken: draft.authenticationToken.trim(),
  })

  if (!parsed.success) {
    return {
      ok: false as const,
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
    }
  }

  try {
    parseAndValidateUrl(parsed.data.webhookUrl)
  } catch (error) {
    return {
      ok: false as const,
      fieldErrors: {
        webhookUrl: error instanceof Error ? error.message : "Enter a valid webhook URL.",
      },
    }
  }

  const now = new Date().toISOString()

  return {
    ok: true as const,
    webhook: {
      id: parsed.data.id ?? existingWebhook?.id ?? randomId(),
      name: parsed.data.name,
      webhookUrl: parsed.data.webhookUrl,
      authenticationToken: parsed.data.authenticationToken,
      isDefault: parsed.data.isDefault,
      fields: existingWebhook?.fields ?? [],
      createdAt: existingWebhook?.createdAt ?? now,
      updatedAt: now,
      lastTestStatus: existingWebhook?.lastTestStatus ?? "idle",
      lastTestedAt: existingWebhook?.lastTestedAt,
      lastUsedAt: existingWebhook?.lastUsedAt,
    },
  }
}

export function validateWebhookFields(fields: WebhookFieldDraft[]) {
  if (fields.length === 0) {
    return {
      ok: false as const,
      message: "Add at least one field to the webhook payload.",
    }
  }

  const parsedFields: WebhookField[] = []

  for (const field of fields) {
    const parsed = webhookFieldSchema.safeParse(field)

    if (!parsed.success) {
      return {
        ok: false as const,
        message: parsed.error.issues[0]?.message ?? "Fix the field configuration.",
      }
    }

    const normalizedField = normalizeFieldDefaults(parsed.data)

    if (normalizedField.key.length === 0) {
      return {
        ok: false as const,
        message: `Use letters or numbers in the JSON key for ${normalizedField.label}.`,
      }
    }

    parsedFields.push(normalizedField)
  }

  const normalizedKeys = parsedFields.map((field) => field.key)
  const uniqueKeys = new Set(normalizedKeys)

  if (uniqueKeys.size !== normalizedKeys.length) {
    return {
      ok: false as const,
      message: "Each payload field needs a unique JSON key.",
    }
  }

  return {
    ok: true as const,
    fields: parsedFields,
  }
}

export function parseImportedWebhooks(input: string) {
  let parsedJson: unknown

  try {
    parsedJson = JSON.parse(input)
  } catch {
    return {
      ok: false as const,
      error: "Paste valid JSON to import webhook configs.",
    }
  }

  const nestedWebhooks =
    parsedJson && typeof parsedJson === "object"
      ? (parsedJson as { webhooks?: unknown[] }).webhooks
      : undefined
  const MAX_IMPORT_COUNT = 50
  const rawCandidates: unknown[] = Array.isArray(parsedJson)
    ? parsedJson
    : Array.isArray(nestedWebhooks)
      ? nestedWebhooks
      : [parsedJson]

  if (rawCandidates.length > MAX_IMPORT_COUNT) {
    return {
      ok: false as const,
      error: `Import up to ${MAX_IMPORT_COUNT} webhooks at a time.`,
    }
  }

  const candidates = rawCandidates.slice(0, MAX_IMPORT_COUNT)
  const nextWebhooks: WebhookConfig[] = []

  for (const candidate of candidates) {
    const result = webhookConfigSchema.safeParse(candidate)

    if (!result.success) {
      return {
        ok: false as const,
        error: result.error.issues[0]?.message ?? "One imported webhook is invalid.",
      }
    }

    try {
      parseAndValidateUrl(result.data.webhookUrl)
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "One imported webhook URL is invalid.",
      }
    }

    const fieldsResult = validateWebhookFields(result.data.fields)
    if (!fieldsResult.ok) {
      return {
        ok: false as const,
        error: fieldsResult.message,
      }
    }

    const now = new Date().toISOString()

    nextWebhooks.push({
      ...result.data,
      id: randomId(),
      fields: fieldsResult.fields,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      lastTestStatus: "idle",
      lastTestedAt: undefined,
      lastUsedAt: undefined,
    })
  }

  if (nextWebhooks.length === 0) {
    return {
      ok: false as const,
      error: "No webhook configs were found in the import payload.",
    }
  }

  return {
    ok: true as const,
    webhooks: nextWebhooks,
  }
}

function normalizeFieldDefaults(field: WebhookField): WebhookField {
  const normalizedKey = field.type === "builtin"
    ? normalizeBuiltinKey(field.builtinKey, field.key)
    : toSnakeCase(field.key)

  if (field.type === "builtin") {
    return {
      ...field,
      key: normalizedKey,
      label: field.label.trim(),
    }
  }

  if (isBasicField(field)) {
    return {
      ...field,
      key: normalizedKey,
      label: field.label.trim(),
      defaultValue: field.defaultValue.trim(),
    }
  }

  if (field.type === "multiple_choice" || field.type === "dropdown") {
    const options = dedupeOptions(field.options)

    return {
      ...field,
      key: normalizedKey,
      label: field.label.trim(),
      options,
      defaultValue: options.includes(field.defaultValue.trim()) ? field.defaultValue.trim() : "",
    }
  }

  if (field.type === "checkbox") {
    return {
      ...field,
      key: normalizedKey,
      label: field.label.trim(),
    }
  }

  if (field.type === "multi_select") {
    const options = dedupeOptions(field.options)

    return {
      ...field,
      key: normalizedKey,
      label: field.label.trim(),
      options,
      defaultValue: field.defaultValue.filter((value) => options.includes(value)),
    }
  }

  if (field.type === "matrix") {
    const rows = dedupeOptions(field.rows)
    const columns = dedupeOptions(field.columns)
    const defaultValue = Object.fromEntries(
      rows.map((row) => {
        const selectedValue = field.defaultValue[row]
        return [row, columns.includes(selectedValue) ? selectedValue : ""]
      })
    )

    return {
      ...field,
      key: normalizedKey,
      label: field.label.trim(),
      rows,
      columns,
      defaultValue,
    }
  }

  if (field.type === "rating") {
    const max = clampInteger(field.max, 2, 10)
    const defaultValue = normalizeScaleDefault(field.defaultValue, 1, max)

    return {
      ...field,
      key: normalizedKey,
      label: field.label.trim(),
      max,
      defaultValue,
    }
  }

  if (field.type === "linear_scale") {
    const min = Math.round(field.min)
    const max = Math.round(field.max)
    const defaultValue = normalizeScaleDefault(field.defaultValue, min, max)

    return {
      ...field,
      key: normalizedKey,
      label: field.label.trim(),
      min,
      max,
      minLabel: field.minLabel.trim(),
      maxLabel: field.maxLabel.trim(),
      defaultValue,
    }
  }

  if (field.type === "ranking") {
    const options = dedupeOptions(field.options)
    const seen = new Set<string>()
    const orderedDefaults = field.defaultValue
      .filter((value) => options.includes(value))
      .filter((value) => {
        if (seen.has(value)) {
          return false
        }

        seen.add(value)
        return true
      })
    const missingDefaults = options.filter((option) => !seen.has(option))

    return {
      ...field,
      key: normalizedKey,
      label: field.label.trim(),
      options,
      defaultValue: [...orderedDefaults, ...missingDefaults],
    }
  }

  return field
}

function normalizeBuiltinKey(builtinKey: BuiltinFieldKey, key: string) {
  return toSnakeCase(key) || BUILTIN_FIELD_DEFINITIONS[builtinKey].key
}

function normalizeScaleDefault(value: string, min: number, max: number) {
  const normalized = Number(value.trim())

  if (!Number.isFinite(normalized) || normalized < min || normalized > max) {
    return ""
  }

  return String(Math.round(normalized))
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function isBasicField(
  field: WebhookField
): field is Extract<
  WebhookField,
  {
    type:
      | "short_text"
      | "long_text"
      | "number"
      | "email"
      | "phone"
      | "link"
      | "signature"
      | "date"
      | "time"
  }
> {
  return (
    field.type === "short_text" ||
    field.type === "long_text" ||
    field.type === "number" ||
    field.type === "email" ||
    field.type === "phone" ||
    field.type === "link" ||
    field.type === "signature" ||
    field.type === "date" ||
    field.type === "time"
  )
}

function dedupeOptions(options: string[]) {
  return [...new Set(options.map((option) => option.trim()).filter((option) => option.length > 0))]
}

function toFieldErrors<T extends string>(fieldErrors: Partial<Record<T, string[] | undefined>>) {
  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, value]) => Array.isArray(value) && value.length > 0)
      .map(([key, value]) => [key, (Array.isArray(value) ? value[0] : undefined) ?? "Invalid value."])
  ) as FieldErrors<T>
}
