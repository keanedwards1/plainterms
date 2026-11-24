import { defineConfig, devices } from "@playwright/test";

// Next allows one dev server per project, so reuse the usual one on 3000 when it is running.
const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// End-to-end tests run in the installed Google Chrome (channel "chrome"), so
// no separate browser download is needed locally. Set E2E_BASE_URL to test a
// deployed preview instead of a local dev server.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // Keep test traffic out of analytics.
        env: { NEXT_PUBLIC_GA_MEASUREMENT_ID: "", NEXT_PUBLIC_CLARITY_PROJECT_ID: "", NEXT_PUBLIC_META_PIXEL_ID: "" },
      },
});
