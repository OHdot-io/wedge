# Security Notes

## Current model (MVP)
- Wedge sends directly from extension to Clay webhook URL.
- Webhook config is stored in `chrome.storage.local`.
- Tokens are masked in UI but stored locally for usability.
- Payload schemas, preview state, and recent activity stay local to the browser profile.

## Risks
- Local machine/browser compromise can expose webhook tokens.
- A leaked token can be used to send unauthorized payloads to that Clay webhook.

## Built-in safety controls
- HTTPS-only webhook URLs.
- Optional authentication token per webhook.
- Explicit field-by-field payload configuration in settings.
- Minimal permissions (`storage`, `activeTab`, `contextMenus`).

## Operational best practices
- Rotate Clay auth tokens regularly.
- Use one token per webhook/workflow.
- Keep webhook field schemas minimal; avoid sending sensitive page content unless needed.
- If higher assurance is required, use a backend vault pattern and avoid long-lived local token storage.
