# Wedge Quickstart (5 minutes)

## 1) Prepare a Clay webhook
1. In Clay, create/open a table source "Pull in data from a Webhook".
2. Copy the webhook URL.
3. Copy the auth token shown by Clay if your table uses one.

## 2) Build the extension
1. Run `npm install`.
2. Run `npm run build`.

## 3) Load extension locally
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist/` folder from this repo.

## 4) Configure the first webhook
1. Click the Wedge extension icon.
2. Click **Open Settings**.
3. Add:
   - Webhook name (ex: `Leads`)
   - HTTPS webhook URL
   - Optional authentication token
4. Save the webhook.
5. In the **Payload** tab, keep the default page fields or add your own custom fields.

## 5) Send data
1. Open any HTTPS webpage.
2. Click the extension popup.
3. Choose the webhook from the dropdown.
4. Fill in any custom fields and expand **Preview JSON** if needed.
5. Click **Send**.

You now have a simple local-first setup with settings-based webhook management and reusable payload schemas.
