import { expect, test } from "@playwright/test";

test.describe("CROS dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-28T12:00:00Z"));
    await page.goto("/crosboard/");
  });

  test("loads the command board and primary revenue surfaces", async ({
    page,
  }) => {
    await expect(page).toHaveTitle("CROS — Creator Revenue OS");
    await expect(
      page.getByRole("heading", { name: /Build once/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your revenue stack" })
    ).toBeVisible();
    await expect(page.getByText("$9,170").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Revenue rhythm" })
    ).toBeVisible();
  });

  test("adds a product to the revenue stack", async ({ page }) => {
    await page.getByRole("button", { name: /Add a product/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("Product title").fill("The Sunday Dispatch");
    await page.getByRole("button", { name: /Add to stack/i }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "The Sunday Dispatch" })
    ).toBeVisible();
    await expect(
      page.getByText("Sample product added for this session.")
    ).toBeVisible();
  });

  test("switches revenue chart ranges", async ({ page }) => {
    const chart = page.locator(".chart-panel");
    await expect(chart.locator(".chart-summary strong")).toHaveText("$9,170");

    await chart.getByRole("button", { name: "30D" }).click();
    await expect(chart.locator(".chart-summary strong")).toHaveText("$40,150");

    await chart.getByRole("button", { name: "MTD" }).click();
    await expect(chart.locator(".chart-summary strong")).toHaveText("$36,680");
  });

  test("completes a next move", async ({ page }) => {
    const move = page.getByRole("button", {
      name: /Share the wine club waitlist update/i,
    });
    await expect(page.getByText("3 open")).toBeVisible();

    await move.click();

    await expect(page.getByText("2 open")).toBeVisible();
    await expect(move).toHaveClass(/is-done/);
  });

  test("opens and closes the mobile navigation", async ({ page }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) > 760,
      "mobile navigation is covered on the mobile project"
    );
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator(".sidebar")).toHaveClass(/sidebar-open/);
    const sidebar = page.locator(".sidebar");
    await expect(
      sidebar.getByRole("button", { name: "Close navigation" })
    ).toBeVisible();

    await sidebar.getByRole("button", { name: "Close navigation" }).click();
    await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar-open/);
  });
});
