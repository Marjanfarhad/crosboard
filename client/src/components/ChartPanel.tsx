import React from "react";
import { TrendingUp, Zap } from "lucide-react";

type Range = "7D" | "30D" | "MTD";

type Bar = { label: string; value: number; amount: string };

export default function ChartPanel({
  bars,
  range,
  setRange,
  pace,
}: {
  bars: Bar[];
  range: Range;
  setRange: (r: Range) => void;
  pace: string;
}) {
  return (
    <div className="chart-panel panel">
      <div className="panel-heading">
        <div>
          <div className="section-kicker">02 / Pulse</div>
          <h2>Revenue rhythm</h2>
        </div>
        <div className="range-toggle" aria-label="Chart range">
          {["7D", "30D", "MTD"].map((item) => (
            <button key={item} className={range === item ? "selected" : ""} onClick={() => setRange(item as Range)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-summary">
        <div>
          <span>Current pace</span>
          <strong>{pace}</strong>
        </div>
        <div className="chart-summary-change">
          <TrendingUp size={15} /> 18.4% vs previous
        </div>
      </div>

      <div className="bar-chart">
        {bars.map((bar, index) => (
          <div className="bar-column" key={`${bar.label}-${index}`}>
            <span className="bar-value">{bar.amount}</span>
            <div className={`bar`} style={{ height: `${bar.value}%` }} />
          </div>
        ))}
      </div>

      <div className="chart-footer">
        <span>
          <i className="legend-dot" /> booked revenue
        </span>
        <span>last updated 12 min ago</span>
      </div>
    </div>
  );
}
