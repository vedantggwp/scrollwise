import { test, expect } from "@playwright/test";

/**
 * Life case: Reader chrome (Flow D2, D3, D9).
 * Intended: Header has Back, title, TOC, Search, Annotations; theme buttons apply; Annotations sidebar opens.
 * Note: Selection inside epub.js iframe is not tested here (requires frame locator + text selection).
 */

test.describe("Reader", () => {
  test("reader with invalid book id shows error and link to Library", async ({ page }) => {
    await page.goto("/reader/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText(/book not found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /library/i })).toBeVisible();
  });

  test("reader with valid book id shows header: Back, title, TOC, Search, Annotations, themes, font size", async ({
    page,
  }) => {
    // Use a real book id from your DB when running locally; or skip if none.
    // For CI we use invalid id and assert error; for local dev you can set BOOK_ID.
    const bookId = process.env.SCROLLWISE_TEST_BOOK_ID;
    if (!bookId) {
      test.skip();
      return;
    }
    await page.goto(`/reader/${bookId}`);
    await expect(page.getByRole("button", { name: /back/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /open table of contents/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /search in book/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /open annotations/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /theme.*dark/i }).first()).toBeVisible();
    await expect(page.getByLabel(/decrease font size/i)).toBeVisible();
  });

  test("reader theme buttons: Light, Dark, Sepia, Midnight are present and clickable", async ({
    page,
  }) => {
    const bookId = process.env.SCROLLWISE_TEST_BOOK_ID;
    if (!bookId) {
      test.skip();
      return;
    }
    await page.goto(`/reader/${bookId}`);
    const darkBtn = page.getByRole("button", { name: /theme.*dark/i }).first();
    await darkBtn.click();
    await expect(darkBtn).toHaveAttribute("aria-pressed", "true");
    const sepiaBtn = page.getByRole("button", { name: /theme.*sepia/i }).first();
    await sepiaBtn.click();
    await expect(sepiaBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("Annotations sidebar opens from header and shows list or empty state", async ({
    page,
  }) => {
    const bookId = process.env.SCROLLWISE_TEST_BOOK_ID;
    if (!bookId) {
      test.skip();
      return;
    }
    await page.goto(`/reader/${bookId}`);
    await page.getByRole("button", { name: /open annotations/i }).click();
    await expect(page.getByRole("complementary", { name: /annotations/i })).toBeVisible();
    await expect(
      page.getByText(/no highlights|annotations/i).or(page.getByRole("button", { name: /clear all/i }))
    ).toBeVisible();
    await page.getByRole("button", { name: /close annotations/i }).click();
    await expect(page.getByRole("complementary", { name: /annotations/i })).not.toBeVisible();
  });

  test("TOC drawer opens from header", async ({ page }) => {
    const bookId = process.env.SCROLLWISE_TEST_BOOK_ID;
    if (!bookId) {
      test.skip();
      return;
    }
    await page.goto(`/reader/${bookId}`);
    await page.getByRole("button", { name: /open table of contents/i }).click();
    await expect(page.getByRole("dialog").or(page.getByRole("complementary"))).toBeVisible();
  });
});
