import { test as base, expect } from "@playwright/test";

// Every test starts with cookie choices already made (analytics off), so the
// consent banner never covers the page.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "pt_cookie_consent_v2",
        JSON.stringify({ analytics: false, advertising: false })
      );
    });
    await use(page);
  },
});

export { expect };
