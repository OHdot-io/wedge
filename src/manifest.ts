import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Wedge for OH.io",
  description: "Chrome extension for sending page context to Clay for BDR self-prospecting.",
  version: "1.0.8",
  permissions: ["storage", "activeTab", "scripting"],
  host_permissions: ["https://*/*"],
  icons: {
    16: "src/assets/icon-16.png",
    32: "src/assets/icon-32.png",
    48: "src/assets/icon-48.png",
    128: "src/assets/icon-128.png"
  },
  action: {
    default_title: "Wedge",
    default_popup: "src/popup/index.html",
    default_icon: {
      16: "src/assets/icon-16.png",
      32: "src/assets/icon-32.png"
    }
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background.ts",
    type: "module"
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'"
  }
});
