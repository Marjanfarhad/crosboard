import { describe, expect, it } from "vitest";
import { buildSampleChart, workspaceDate } from "./sampleChart";

describe("sample reporting periods", () => {
  const today = workspaceDate(new Date("2026-10-28T12:00:00Z"));
  it("uses Kabul's calendar day across a UTC boundary", () => {
    expect(workspaceDate(new Date("2026-10-27T20:00:00Z")).iso).toBe(
      "2026-10-28"
    );
  });
  it("totals every displayed bucket and keeps overlapping days consistent", () => {
    const week = buildSampleChart("7D", today);
    const month = buildSampleChart("MTD", today);
    const thirty = buildSampleChart("30D", today);
    for (const chart of [week, month, thirty]) {
      expect(chart.total).toBe(
        chart.bars.reduce((sum, bar) => sum + bar.amount, 0)
      );
      expect(chart.bars.every(bar => bar.value > 0 && bar.value <= 90)).toBe(
        true
      );
    }
    expect(week.bars).toHaveLength(7);
    expect(week.bars[0].label).toBe("Oct 22");
    expect(week.bars[6].label).toBe("Oct 28");
    expect(thirty.bars[0].label).toBe("Sep 29–Oct 3");
    // Aggregation must not change the underlying sample day values.
    const lastFive = Array.from(
      { length: 5 },
      (_, i) =>
        buildSampleChart(
          "MTD",
          workspaceDate(
            new Date(`2026-10-${String(24 + i).padStart(2, "0")}T12:00:00Z`)
          )
        ).total
    );
    expect(month.bars.at(-1)?.amount).toBe(lastFive[4] - lastFive[1]);
  });
  it("handles a one-day month and leap day without future or empty buckets", () => {
    const first = buildSampleChart(
      "MTD",
      workspaceDate(new Date("2026-11-01T00:00:00Z"))
    );
    expect(first.bars).toHaveLength(1);
    expect(first.bars[0].label).toBe("Nov 1");
    expect(
      buildSampleChart(
        "MTD",
        workspaceDate(new Date("2028-02-29T00:00:00Z"))
      ).bars.at(-1)?.label
    ).toBe("Feb 26–Feb 29");
  });
});
