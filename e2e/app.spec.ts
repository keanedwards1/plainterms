import { expect, test } from "./fixtures";

test.describe("home workspace", () => {
  test("opens straight into the upload workspace", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Drop a contract or lease here")).toBeVisible();
    await expect(page.getByRole("heading", { name: "What you get back" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Tools" }).getByRole("link", { name: "Explain a letter" })).toBeVisible();
  });

  test("sample contract fills the paste box and enables Read it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Try a sample contract" }).click();
    await expect(page.getByLabel("Document text")).toHaveValue(/HOME IMPROVEMENT AGREEMENT/);
    await expect(page.getByRole("button", { name: "Read it" })).toBeEnabled();
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
    for (const path of ["/", "/tools", "/templates", "/tools/write-a-letter", "/tools/explain-a-letter", "/deadlines"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("letter writer", () => {
  test("the letter fills in as you type", async ({ page }) => {
    await page.goto("/tools/write-a-letter");
    await page.getByLabel("Who owes you").fill("Brightline Remodeling");
    await page.getByLabel("Amount").fill("$6,200");
    const letter = page.getByRole("article", { name: "Your letter" });
    await expect(letter).toContainText("Brightline Remodeling");
    await expect(letter).toContainText("$6,200");
    await page.getByRole("button", { name: "Security deposit back" }).click();
    await expect(letter).toContainText("Return of my security deposit");
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
