import { expect, test, type Page } from "@playwright/test";

async function navigate(page: Page, name: string) {
  if ((page.viewportSize()?.width ?? 0) <= 760)
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-28T12:00:00Z"));
  await page.goto("/crosboard/");
});

test("each main destination shows its own surface and honest integration state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await expect(page.getByText("Demo workspace — sample data")).toBeVisible();
  await expect(page.locator(".breadcrumb")).toContainText("Oct 28, 2026");
  await navigate(page, "Products");
  await expect(
    page.getByRole("heading", { name: "Your revenue stack" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Revenue rhythm" })
  ).toHaveCount(0);
  await navigate(page, "Studio");
  await expect(page.getByText("Needs edits · 3 remaining")).toBeVisible();
  await expect(page.getByText("READY TO PUBLISH", { exact: true })).toHaveCount(
    0
  );
  await page.getByRole("button", { name: "View review checklist" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No edits or approvals have been completed"
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await navigate(page, "Performance");
  await expect(
    page.getByRole("heading", { name: "Revenue rhythm" })
  ).toBeVisible();
  await navigate(page, "Analyst");
  await expect(
    page.getByRole("heading", { name: "No live analysis available" })
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("search opens matching product and clearing or cancelling does not hide the portfolio", async ({
  page,
}) => {
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog");
  const input = page.getByLabel("Product title to find");
  await expect(input).toBeFocused();
  await input.fill("notes");
  await expect(dialog.getByRole("status")).toHaveText("1 matching products");
  await dialog
    .getByRole("button", { name: "Signal Notes", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Products", exact: true })
  ).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(3);
  await page.keyboard.press("Control+k");
  await input.fill("no-such-title");
  await expect(dialog.getByText(/No products match/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator(".product-card")).toHaveCount(3);
});

test("empty product validation, focus trap, and truthful session reset", async ({
  page,
}) => {
  const opener = page.getByRole("button", {
    name: "Add a product",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(page.getByLabel("Product title", { exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Add to stack" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Give the product a working title first."
  );
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate(el => el.contains(document.activeElement))
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await opener.click();
  await page
    .getByLabel("Product title", { exact: true })
    .fill("Review fixture");
  await dialog.getByRole("button", { name: "Add to stack" }).click();
  await expect(
    page.getByRole("heading", { name: "Review fixture" })
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Review fixture" })
  ).toHaveCount(0);
  await expect(
    page.getByText(/Products and checklist changes last until reload/)
  ).toBeVisible();
});

test("chart periods match table totals and monthly metric", async ({
  page,
}) => {
  const chart = page.locator(".chart-panel");
  await chart.getByText("View chart data", { exact: true }).click();
  await chart.getByRole("button", { name: "30D", exact: true }).click();
  await expect(
    chart.getByRole("button", { name: "30D", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(chart.locator("caption")).toContainText("Sep 29–Oct 28, 2026");
  await expect(chart.locator("tbody tr")).toHaveCount(6);
  await expect(chart.locator("tfoot")).toContainText("$40,150");
  const sum = await chart
    .locator("tbody td")
    .evaluateAll(cells =>
      cells.reduce(
        (sum, cell) => sum + Number(cell.textContent?.replace(/[^\d]/g, "")),
        0
      )
    );
  expect(sum).toBe(40150);
  await chart.getByRole("button", { name: "MTD", exact: true }).click();
  await expect(chart.locator("tfoot")).toContainText("$36,680");
  await expect(page.getByRole("region", { name: "Key metrics" })).toContainText(
    "$36,680"
  );
});

test("next moves scrolls into view and all main views fit the viewport", async ({
  page,
}) => {
  await page.getByRole("button", { name: "View next moves" }).click();
  await expect(
    page.getByRole("region", { name: "Next moves checklist" })
  ).toBeInViewport();
  await expect(
    page.getByRole("region", { name: "Next moves checklist" })
  ).toBeFocused();
  for (const name of ["Products", "Studio", "Performance", "Analyst"]) {
    await navigate(page, name);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
  }
});

test("help provides a usable explanation and no false cloud promise", async ({
  page,
}) => {
  if ((page.viewportSize()?.width ?? 0) <= 760)
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("button", { name: "Help center", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Workspace help" })
  ).toBeVisible();
  await expect(dialog).toContainText("not backed up or synced");
  await expect(dialog).toContainText("Kabul time");
});
