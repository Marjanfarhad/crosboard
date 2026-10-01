import { expect, test } from "@playwright/test";

test("desktop dashboard stays within performance budgets", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) <= 760, "performance budget runs on the desktop project");

  const response = await page.goto("/crosboard/", { waitUntil: "networkidle" });
  expect(response?.ok()).toBeTruthy();

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const transferBytes = resources.reduce((total, resource) => total + (resource.transferSize || 0), 0);

    return {
      domContentLoaded: navigation.domContentLoadedEventEnd,
      load: navigation.loadEventEnd,
      resourceCount: resources.length,
      transferBytes,
    };
  });

  expect(metrics.domContentLoaded, "DOMContentLoaded should remain under 3 seconds").toBeLessThan(3_000);
  expect(metrics.load, "load event should remain under 5 seconds").toBeLessThan(5_000);
  expect(metrics.resourceCount, "the dashboard should stay below 80 network resources").toBeLessThan(80);
  expect(metrics.transferBytes, "the dashboard should transfer less than 2 MB").toBeLessThan(2_000_000);
});
