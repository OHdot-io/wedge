import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import AxeBuilder from "@axe-core/playwright"
import { chromium, expect, test, type Page } from "playwright/test"

test("popup points first-run users to settings and passes basic accessibility checks", async () => {
  const session = await launchExtension()

  try {
    const page = await session.context.newPage()
    await page.goto(session.url("src/popup/index.html"))

    await expect(page.getByText("Add your first webhook")).toBeVisible()
    await expect(page.getByRole("button", { name: "New webhook" })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const seriousViolations = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    )

    expect(seriousViolations).toEqual([])
  } finally {
    await session.close()
  }
})

test("settings uses a breadcrumb editor flow and auto-generates snake_case custom keys", async () => {
  const session = await launchExtension()

  try {
    const page = await session.context.newPage()
    await page.goto(session.url("src/options/index.html"))

    await expect(page.getByText("Add your first webhook")).toBeVisible()
    await page.getByRole("button", { name: "New webhook" }).first().click()

    await expect(page.getByRole("link", { name: "Create webhook" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Create webhook" })).toBeVisible()

    await page.getByLabel("Webhook name").fill("Clay leads")
    await page.getByLabel("Webhook URL").fill("https://httpbin.org/post")
    await addShortTextField(page)

    await expect(page.getByLabel("JSON key").last()).toHaveValue("short_text_1")
    await page.getByLabel("Label").last().fill("Lead note")
    await page.getByRole("button", { name: "Add webhook" }).first().click()

    await expect(page.getByText("Webhook created")).toBeVisible()
    await expect(page.getByRole("button", { name: "Clay leads", exact: true })).toBeVisible()

    await page.getByRole("button", { name: "Actions for Clay leads" }).click()
    await page.getByRole("menuitem", { name: "Edit" }).click()

    await expect(page.getByRole("link", { name: "Clay leads" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Edit webhook" })).toBeVisible()
    await expect(page.getByLabel("Webhook name")).toHaveValue("Clay leads")
  } finally {
    await session.close()
  }
})

test("popup renders schema-driven fields, preview JSON, and add-new entry", async () => {
  const session = await launchExtension()

  try {
    await createWebhookWithShortTextField(session.context, session.url)

    const popupPage = await session.context.newPage()
    await popupPage.goto(session.url("src/popup/index.html"))

    await expect(popupPage.getByRole("combobox", { name: "Webhook" })).toContainText("Clay leads")
    await expect(popupPage.getByLabel("Lead note")).toBeVisible()
    await expect(popupPage.getByRole("button", { name: "JSON preview" })).toBeVisible()

    await popupPage.getByRole("button", { name: "JSON preview" }).click()
    await expect(popupPage.locator("pre code")).toContainText('"short_text_1": ""')

    await expect(popupPage.getByRole("button", { name: "Manage webhooks" })).toBeVisible()
  } finally {
    await session.close()
  }
})

test("settings can import multiple webhook configs into the CRUD list", async () => {
  const session = await launchExtension()

  try {
    const page = await session.context.newPage()
    await page.goto(session.url("src/options/index.html"))

    await page.getByRole("button", { name: "Import webhooks" }).click()
    await page
      .getByLabel("Import webhook JSON")
      .fill(
        JSON.stringify(
          {
            webhooks: [
              {
                id: "one",
                name: "Imported one",
                webhookUrl: "https://httpbin.org/post",
                authenticationToken: "",
                isDefault: false,
                fields: [
                  {
                    id: "field-one",
                    type: "builtin",
                    builtinKey: "url",
                    key: "url",
                    label: "Page URL",
                    required: true,
                  },
                ],
                createdAt: new Date("2026-03-07T08:00:00.000Z").toISOString(),
                updatedAt: new Date("2026-03-07T08:00:00.000Z").toISOString(),
              },
              {
                id: "two",
                name: "Imported two",
                webhookUrl: "https://httpbin.org/post",
                authenticationToken: "",
                isDefault: false,
                fields: [
                  {
                    id: "field-two",
                    type: "short_text",
                    key: "note",
                    label: "Note",
                    required: false,
                    defaultValue: "",
                  },
                ],
                createdAt: new Date("2026-03-07T08:00:00.000Z").toISOString(),
                updatedAt: new Date("2026-03-07T08:00:00.000Z").toISOString(),
              },
            ],
          },
          null,
          2
        )
      )

    await page.getByRole("button", { name: "Import", exact: true }).click()

    await expect(page.getByText("Webhooks imported")).toBeVisible()
    await expect(page.getByRole("button", { name: "Imported one", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Imported two", exact: true })).toBeVisible()
  } finally {
    await session.close()
  }
})

async function createWebhookWithShortTextField(
  context: Awaited<ReturnType<typeof launchExtension>>["context"],
  url: (entry: string) => string
) {
  const settingsPage = await context.newPage()
  await settingsPage.goto(url("src/options/index.html"))

  await settingsPage.getByRole("button", { name: "New webhook" }).first().click()
  await settingsPage.getByLabel("Webhook name").fill("Clay leads")
  await settingsPage.getByLabel("Webhook URL").fill("https://httpbin.org/post")
  await addShortTextField(settingsPage)
  await settingsPage.getByLabel("Label").last().fill("Lead note")
  await settingsPage.getByRole("button", { name: "Add webhook" }).first().click()
  await expect(settingsPage.getByText("Webhook created")).toBeVisible()
}

async function addShortTextField(page: Page) {
  await page.getByRole("button", { name: "Add field" }).click()
  await page.getByRole("menuitem", { name: "Text", exact: true }).click()
}

async function launchExtension() {
  const extensionPath = path.resolve("dist")
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wedge-e2e-"))
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chrome",
    headless: false,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })

  let [serviceWorker] = context.serviceWorkers()
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 })
  }

  const extensionId = new URL(serviceWorker.url()).host

  return {
    context,
    extensionId,
    url(entry: string) {
      return `chrome-extension://${extensionId}/${entry}`
    },
    async close() {
      await context.close()
      fs.rmSync(userDataDir, { recursive: true, force: true })
    },
  }
}
