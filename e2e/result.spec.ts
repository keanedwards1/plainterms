import { expect, test } from "./fixtures";

// These run against /result/fixture-*, which the server serves from
// e2e/fixtures only when E2E_FIXTURES=1 (set in playwright.config.ts).
const STEPS = ["The deal", "The contract", "Decide", "Prepare", "Send", "Confirmation"];

async function goToStep(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("navigation", { name: "Steps" }).getByRole("button", { name: new RegExp(`^${name}`) }).click();
}

test.describe("step-by-step result", () => {
  test("walks all six steps without sideways scrolling", async ({ page }) => {
    await page.goto("/result/fixture-harbor");
    await expect(page.getByRole("heading", { level: 1, name: "Production services agreement" })).toBeVisible();
    await expect(page.getByText(/Reviewed for Luna Park Studio/)).toBeVisible();
    await expect(page.getByText("higher means riskier")).toBeVisible();

    for (const name of STEPS) {
      await goToStep(page, name);
      await expect(page.getByRole("button", { name: new RegExp(`^${name}`) })).toHaveAttribute("aria-current", "step");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${name} scrolls sideways`).toBeLessThanOrEqual(1);
    }
    await expect(page.getByRole("heading", { name: "Confirmation" })).toBeVisible();
    await expect(page.getByText("Not legal advice.")).toBeVisible();
  });

  test("the contract step marks issues and switches views", async ({ page }) => {
    await page.goto("/result/fixture-harbor");
    await goToStep(page, "The contract");
    const contract = page.getByRole("article", { name: "Contract" });
    await expect(contract.locator(".rv-mk")).toHaveCount(6);
    await page.getByRole("button", { name: "Track changes" }).click();
    await expect(contract.locator("ins").first()).toBeVisible();
    await page.getByRole("button", { name: "Revised", exact: true }).click();
    await expect(contract).toContainText("Date/Effective Date: March 4, 2026");
    await expect(page.getByText("Checked and fine")).toBeVisible();
  });

  test("send offers email, edited contract or both", async ({ page }) => {
    await page.goto("/result/fixture-harbor");
    await goToStep(page, "Send");
    const email = page.getByRole("textbox", { name: "Email", exact: true });

    // Both (the default for Pro): the editor and an email that mentions the attachment.
    await expect(page.getByRole("heading", { name: "Edited contract" })).toBeVisible();
    await expect(email).toHaveValue(/attached the agreement with these changes marked up/);

    await page.getByRole("radiogroup", { name: "How to send" }).getByText("Email", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "Edited contract" })).toHaveCount(0);
    await expect(email).not.toHaveValue(/attached/);

    await page.getByRole("radiogroup", { name: "How to send" }).getByText("Edited contract", { exact: true }).click();
    await expect(email).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Download Word (.docx)" })).toBeVisible();
  });

  test("ticking a change in the contract updates the asks, and the contract zooms", async ({ page }) => {
    await page.goto("/result/fixture-harbor");
    await goToStep(page, "Prepare");
    const picked = page.getByText(/\d of 6 picked/);
    const before = await picked.innerText();
    await goToStep(page, "Send");

    const firstBox = page.locator(".rv-rl-keep input").first();
    await firstBox.uncheck();
    await goToStep(page, "Prepare");
    await expect(picked).not.toHaveText(before);

    await goToStep(page, "Send");
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.getByRole("button", { name: "Reset zoom" })).toHaveText("115%");
    await page.getByRole("button", { name: "Clean", exact: true }).click();
    await expect(page.locator(".rv-desk del").first()).toBeHidden();
  });

  test("legal terms show their meaning", async ({ page }) => {
    await page.goto("/result/fixture-harbor");
    const term = page.locator(".rv-term", { hasText: /arbitration/i }).first();
    // Focus again until the page has hydrated and the tooltip is listening.
    await expect(async () => {
      await term.blur();
      await term.focus();
      await expect(page.getByRole("tooltip")).toContainText(/instead of going to court|decision is final/, { timeout: 1000 });
    }).toPass();
  });

  test("free plans see the edited contract as part of Pro", async ({ page }) => {
    await page.goto("/result/fixture-harbor-free");
    await goToStep(page, "Send");
    await expect(page.getByRole("heading", { name: "Edited contract" })).toHaveCount(0);
    await page.getByRole("radiogroup", { name: "How to send" }).getByText("Edited contract", { exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("classic result page", () => {
  test("results without a review open in the classic view", async ({ page }) => {
    await page.goto("/result/fixture-harbor-old");
    await expect(page.getByRole("navigation", { name: "Steps" })).toHaveCount(0);
    await expect(page.getByText(/File: attachment Heavy 3\.docx/)).toBeVisible();
  });

  test("the classic view stays reachable for new results", async ({ page }) => {
    await page.goto("/result/fixture-harbor");
    await page.getByRole("link", { name: "Classic view" }).click();
    await expect(page).toHaveURL(/\/result\/fixture-harbor\/classic$/);
    await expect(page.getByRole("link", { name: "Step-by-step view" })).toBeVisible();
  });
});

test.describe("results that are still arriving", () => {
  test("steps 1 to 3 work while the asks and edits are still being written", async ({ page }) => {
    await page.goto("/result/fixture-harbor-pending");
    await expect(page.getByRole("heading", { level: 1, name: "Production services agreement" })).toBeVisible();
    await goToStep(page, "Decide");
    await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();
    for (const name of ["Prepare", "Send", "Confirmation"]) {
      await goToStep(page, name);
      await expect(page.getByText("Writing your asks and edits.")).toBeVisible();
    }
  });

  test("the wait shows progress and a game", async ({ page }) => {
    await page.goto("/result/fixture-harbor-refining");
    await expect(page.getByText("This usually takes about a minute.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Progress" })).toContainText("Finding what matters");
    await page.getByRole("button", { name: "Play while you wait" }).click();
    await expect(page.getByRole("button", { name: "Play while you wait" })).toHaveCount(0);
    await page.keyboard.down("ArrowLeft");
    await page.keyboard.up("ArrowLeft");
    await expect(page.getByText(/Score \d+/)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
