import { expect, test } from "@playwright/test";

test.describe("CROS visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/crosboard/");
    await page.evaluate(() => document.fonts?.ready);
  });

  test("desktop dashboard matches the approved visual baseline", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) <= 760, "desktop visual baseline runs on the desktop project");
    await expect(page).toHaveScreenshot("dashboard-desktop.png", {
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 250,
    });
  });

  test("mobile dashboard matches the approved visual baseline", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 760, "mobile visual baseline runs on the mobile project");
    await expect(page).toHaveScreenshot("dashboard-mobile.png", {
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 180,
    });
  });
});
