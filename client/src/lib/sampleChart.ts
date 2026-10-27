export type ChartRange = "7D" | "30D" | "MTD";
const dayMs = 86_400_000;
export function workspaceDate(now = new Date()) {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kabul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const date = new Date(`${iso}T00:00:00Z`);
  return {
    iso,
    time: date.getTime(),
    label: new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
  };
}
export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
const shortDate = (time: number) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(time);

// Fictional daily fixtures shared by every range. Totals are derived, never forecasts.
export function buildSampleChart(
  range: ChartRange,
  today: ReturnType<typeof workspaceDate>
) {
  const end = today.time;
  const start =
    range === "MTD"
      ? Date.UTC(new Date(end).getUTCFullYear(), new Date(end).getUTCMonth(), 1)
      : end - (range === "7D" ? 6 : 29) * dayMs;
  const days = Math.round((end - start) / dayMs) + 1;
  const bucketDays = range === "7D" ? 1 : 5;
  const bars = [];
  for (let offset = 0; offset < days; offset += bucketDays) {
    const bucketEnd = Math.min(offset + bucketDays - 1, days - 1);
    let amount = 0;
    for (let day = offset; day <= bucketEnd; day++) {
      const serial = Math.floor((start + day * dayMs) / dayMs);
      amount += 800 + (((serial % 7) + 7) % 7) * 170;
    }
    bars.push({
      label:
        offset === bucketEnd
          ? shortDate(start + offset * dayMs)
          : `${shortDate(start + offset * dayMs)}–${shortDate(start + bucketEnd * dayMs)}`,
      amount,
      value: 0,
    });
  }
  const maximum = Math.max(...bars.map(bar => bar.amount), 1);
  return {
    bars: bars.map(bar => ({ ...bar, value: (bar.amount / maximum) * 90 })),
    total: bars.reduce((sum, bar) => sum + bar.amount, 0),
    period: `${shortDate(start)}–${shortDate(end)}, ${new Date(end).getUTCFullYear()}`,
    grouping:
      bucketDays === 1
        ? "Daily sample revenue · USD"
        : "Up to 5 days per bar · USD",
  };
}
