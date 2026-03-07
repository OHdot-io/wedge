import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  retries: 0,
  use: {
    headless: true,
    trace: "retain-on-failure"
  },
  reporter: "list"
});
