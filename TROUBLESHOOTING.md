# Troubleshooting

## "The extension will not load"
- Run `npm run build` first.
- Load the generated `dist/` directory, not the old source files.

## "Only HTTPS webhook URLs are allowed by default"
- Use an HTTPS webhook URL.
- If testing locally, you can allow HTTP in Safety Settings (not recommended).

## "Auth token is required"
- Add token on destination settings.
- If "Require entering token on each send" is enabled, provide token in popup field.

## "Webhook failed (401/403)"
- Token is invalid/expired or wrong header name.
- Verify `x-clay-webhook-auth` and rotate token in Clay if needed.

## "Payload too large"
- Reduce payload preset scope or increase max payload bytes in settings.
