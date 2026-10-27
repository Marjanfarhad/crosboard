import { expect, test } from "@playwright/test";

test.describe("CROS visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-28T12:00:00Z"));
    await page.goto("/crosboard/");
    await page.evaluate(() => document.fonts?.ready);
  });

  test("desktop dashboard matches the review candidate baseline", async ({
    page,
  }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) <= 760,
      "desktop visual baseline runs on the desktop project"
    );
    await expect(page).toHaveScreenshot("dashboard-desktop.png", {
      fullPage: false,
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("mobile dashboard matches the review candidate baseline", async ({
    page,
  }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) > 760,
      "mobile visual baseline runs on the mobile project"
    );
    await expect(page).toHaveScreenshot("dashboard-mobile.png", {
      fullPage: false,
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.06,
    });
  });
});
