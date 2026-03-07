# Wedge OSS Plan: Simple Multi-Webhook Chrome Extension for Clay

## 1) Goal

Make Wedge as simple as possible to run:

- Open source Chrome extension.
- **No required backend** for MVP.
- User adds one or more Clay webhooks (URL + auth token) in extension settings.
- User picks a webhook destination in popup and sends page data with one click.
- Optional “results back in extension” path is available later with a tiny deployable callback service.

This keeps setup friction extremely low while still supporting advanced workflows.

---

## 2) Product Scope (Simple-First)

### Must-have (MVP)
1. Destination CRUD (multiple Clay webhooks).
2. One-click send from popup.
3. Context menu send (page URL / selected text / link URL).
4. Payload presets and payload preview.
5. Local send history.

### Nice-to-have (V1.1)
1. Template-based extraction for common sites.
2. Lightweight JSON payload editor with tokens.
3. Import/export extension config as JSON.

### Advanced (V2)
1. Optional callback service for results in extension.
2. Team sync / cloud settings.
3. Hosted reliability features.

---

## 3) Architecture: Two Modes

## Mode A (default, simplest): Direct Extension -> Clay Webhook

- Extension sends `POST` directly to Clay webhook URL.
- Adds auth header (`x-clay-webhook-auth` by default).
- Clay table processes data.
- Extension only tracks send success/failure.

### Why this should be default
- Zero infra to stand up.
- Fastest OSS onboarding.
- Anyone can run it in minutes.

## Mode B (optional): Callback-enabled

- User deploys tiny callback receiver (e.g., Cloudflare Worker / Fly / Render free tier).
- Clay sends final result via HTTP request to callback URL.
- Extension polls callback service (or reads synced endpoint) to display results.

### Why optional
- Adds operational complexity.
- Many users only need fire-and-forget into Clay.

---

## 4) Destination CRUD (How users define multiple webhooks)

A destination is one Clay webhook target.

### Destination schema (stored in `chrome.storage.local`)
- `id` (uuid)
- `name` (e.g., "Leads", "Accounts", "Content Research")
- `webhookUrl`
- `authHeaderName` (default `x-clay-webhook-auth`)
- `authToken` (stored locally; masked in UI)
- `defaultPayloadPreset` (`url_only`, `url_title`, `url_title_selection`, `custom_json`)
- `createdAt`, `updatedAt`, `lastUsedAt`

### CRUD UX
- **Create**: name + webhook URL + auth token.
- **Read**: list + search + “set default”.
- **Update**: edit token/URL/name.
- **Delete**: remove destination with confirm dialog.

### Validation
- “Test webhook” button sends a small payload (`{test:true,timestamp,...}`).
- Show explicit error types:
  - auth failed
  - invalid URL
  - network/CORS issue
  - non-2xx response

---

## 5) Sending Data: Keep It Dead Simple

## Presets (no setup needed)
1. **URL only**
2. **URL + title**
3. **URL + title + selected text**
4. **Link target URL** (from context menu)

## Smart but simple capture additions
- Include `meta.description`, canonical URL, and `og:title` if available.
- Add `capturedAt`, `sourceDomain`, and `tabId` metadata.

## Optional custom payload editor (later)
- JSON with token chips:
  - `{{page.url}}`, `{{page.title}}`, `{{selection.text}}`, `{{meta.description}}`
- Live preview before send.

---

## 6) Extension UX (MV3)

### Popup
- Destination dropdown.
- Payload preset picker.
- “Send to Clay” button.
- Last 10 sends (status + destination + timestamp).

### Context menu
- Send current page.
- Send selected text.
- Send clicked link URL.

### Options page
- Full destination CRUD.
- Test destination button.
- Export/import config.
- Privacy notice and local data clear button.

### Side panel (optional)
- Better view for history.
- Later: callback results view.

---

## 7) Security + Privacy (OSS-friendly)

Because simplicity is key, MVP avoids backend and keeps data local.

### Principles
- Request minimal permissions: `storage`, `activeTab`, `contextMenus`.
- Only collect/send what user chooses.
- No hidden telemetry by default.
- Keep auth tokens masked in UI and only in local extension storage.

### Caveat (important)
- Local storage is convenient but less secure than server-side secrets.
- Document this clearly and offer optional “bring-your-own backend vault” path later.

---

## 8) Callback Results: Minimal-Work Path

If users want results back in extension, avoid forcing a heavy backend.

## Option 1 (recommended advanced): Tiny callback receiver template

Provide an OSS template repo users can one-click deploy that:
1. Accepts callback POST from Clay.
2. Verifies shared secret.
3. Stores recent results in lightweight KV/SQLite.
4. Exposes `GET /results?jobId=...` for extension polling.

## Option 2: No callback (default)
- User checks processed rows directly in Clay.

### Product recommendation
- Ship MVP with Option 2.
- Add Option 1 as documented add-on once core extension is stable.

---

## 9) Suggested Open-Source Stack

### Extension
- TypeScript + React + Vite
- `chrome.storage.local` for settings/history
- Zod for payload validation

### Optional callback template (separate folder/repo)
- Cloudflare Worker + KV (or D1)
- 3 endpoints:
  - `POST /callback`
  - `GET /results`
  - `GET /health`

Keep this optional so basic users need zero infrastructure.

---

## 10) OSS Developer Experience (critical)

### One-command local setup
- `npm install`
- `npm run dev`
- `npm run build`

### First-run setup target: under 5 minutes
1. Create Clay webhook table/source.
2. Copy webhook URL and token.
3. Load unpacked extension.
4. Add destination.
5. Click send on any page.

### Docs to include
- `QUICKSTART.md` (5-minute path)
- `SECURITY.md` (token handling caveats)
- `TROUBLESHOOTING.md` (CORS/auth/common errors)
- `CALLBACK_ADDON.md` (optional callback receiver)

---

## 11) Roadmap (simple)

### Phase 1: Core OSS MVP (1-2 weeks)
- Destination CRUD.
- Popup send.
- Context menu send.
- History + clear history.

### Phase 2: Better payload control (1 week)
- Presets + payload preview.
- Metadata enrichment.
- Export/import settings.

### Phase 3: Optional callback add-on (1-2 weeks)
- Publish callback template.
- Add extension setting to enable callback polling.
- Show result cards in side panel.

---

## 12) Definition of Done (for your "simple + open source" goal)

1. New user can install and send to Clay in <5 minutes with no backend.
2. User can manage multiple webhook destinations in extension UI.
3. User can choose what to send (preset) before submitting.
4. Errors are actionable and easy to fix.
5. Optional callback mode is clearly separated as an add-on, not a requirement.

---

## 13) Immediate Next Steps

1. Build the extension skeleton (MV3 + popup + options + context menus).
2. Implement destination CRUD in `chrome.storage.local`.
3. Implement direct webhook sender with payload presets.
4. Add robust error UI and test-send flow.
5. Write `QUICKSTART.md` with screenshot-driven setup instructions.

This path gives you the easiest possible open-source adoption while preserving room for advanced workflows later.
