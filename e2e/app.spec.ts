import { expect, test } from "./fixtures";

test.describe("home workspace", () => {
  test("opens straight into the upload workspace", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Drop your contract here")).toBeVisible();
    await expect(page.getByRole("button", { name: "Analyze contract" })).toBeDisabled();
    await expect(page.getByRole("heading", { name: "What you'll get" })).toBeVisible();
  });

  test("sample contract fills the paste box and enables Analyze", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Paste text" }).click();
    await page.getByRole("button", { name: "Use a sample contract" }).click();
    await expect(page.getByLabel("Contract text")).toHaveValue(/HOME IMPROVEMENT AGREEMENT/);
    await expect(page.getByRole("button", { name: "Analyze contract" })).toBeEnabled();
  });

  test("rejects unsupported file types before uploading", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="file"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from("not a contract"),
    });
    // Next.js adds its own empty route-announcer alert, so match by text.
    await expect(page.getByRole("alert").filter({ hasText: "Choose a PDF" })).toHaveText(
      "Choose a PDF, Word (.docx) or text file."
    );
  });

  test("never scrolls sideways", async ({ page }) => {
    for (const path of ["/", "/sample-report", "/how-it-works"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("sample report", () => {
  test("revised draft is shown as a Pro feature", async ({ page }) => {
    await page.goto("/sample-report");
    await page.getByRole("button", { name: "Preview Document section" }).click();
    await page.getByRole("button", { name: "Revised", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Revised draft is part of Pro" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("signed out", () => {
  test("the dashboard is not reachable without signing in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test("analyze API requires sign-in", async ({ request }) => {
    const res = await request.post("/api/analyze", {
      data: {
        objectKey: "uploads/x.pdf",
        filename: "x.pdf",
        contentType: "application/pdf",
        size: 10,
        precheckToken: "t",
      },
    });
    expect(res.status()).toBe(401);
  });
});
