# Optional Callback Add-on (Advanced)

If you want results back inside the extension, run a tiny callback receiver service.

## Minimal contract
- `POST /callback` from Clay final HTTP step
  - verifies shared secret
  - stores `{ jobId, status, results, receivedAt }`
- `GET /results?jobId=...`
  - returns latest stored result for extension polling
- `GET /health`
  - service health probe

## Security checklist
- Require HMAC signature header
- Enforce timestamp window + nonce replay guard
- Add rate limiting and schema validation
- Avoid storing raw sensitive data longer than needed

This remains optional; core Wedge works without this service.
