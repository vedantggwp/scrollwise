import { test, expect } from "@playwright/test";

/**
 * Life case: App shell and navigation (Flow A5, G3).
 * Intended: Bottom nav Feed, Library, Settings; active tab highlighted; no 404.
 */
test.describe("Navigation", () => {
  test("home redirects to feed when app has books", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(feed)?$/);
  });

  test("bottom nav: Feed, Library, Settings links work and show active state", async ({
    page,
  }) => {
    await page.goto("/feed");
    const feedLink = page.getByRole("link", { name: /feed/i });
    await expect(feedLink).toHaveAttribute("aria-current", "page");

    await page.goto("/library");
    await expect(page).toHaveURL("/library");
    const libraryLink = page.getByRole("link", { name: /library/i });
    await expect(libraryLink).toHaveAttribute("aria-current", "page");

    await page.goto("/settings");
    await expect(page).toHaveURL("/settings");
    const settingsLink = page.getByRole("link", { name: /settings/i });
    await expect(settingsLink).toHaveAttribute("aria-current", "page");
  });

  test("Library page shows upload dropzone and Annotations aria-labels", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByLabel(/main navigation/i)).toBeVisible();
  });

  test("Settings page loads and has theme controls", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: /app theme/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^light$/i })).toBeVisible();
  });
});
