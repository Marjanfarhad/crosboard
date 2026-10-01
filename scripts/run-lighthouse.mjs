import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.LIGHTHOUSE_URL || "http://127.0.0.1:4173/crosboard/";
const outputDir = resolve(process.env.LIGHTHOUSE_OUTPUT_DIR || "artifacts/lighthouse");
const jsonPath = resolve(outputDir, "report.json");
const htmlPath = resolve(outputDir, "report.html");

mkdirSync(outputDir, { recursive: true });

const commonArgs = [
  url,
  "--preset=desktop",
  "--only-categories=performance,accessibility,best-practices,seo",
  "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage",
  "--no-enable-error-reporting",
  "--quiet",
];

execFileSync("pnpm", ["exec", "lighthouse", ...commonArgs, "--output=json", `--output-path=${jsonPath}`], {
  stdio: "inherit",
});
execFileSync("pnpm", ["exec", "lighthouse", ...commonArgs, "--output=html", `--output-path=${htmlPath}`], {
  stdio: "inherit",
});

const report = JSON.parse(readFileSync(jsonPath, "utf8"));
const thresholds = {
  performance: 0.8,
  accessibility: 0.9,
  "best-practices": 0.9,
  seo: 0.9,
};

let failed = false;
for (const [category, minimum] of Object.entries(thresholds)) {
  const score = report.categories?.[category]?.score;
  const displayScore = typeof score === "number" ? Math.round(score * 100) : "n/a";
  console.log(`Lighthouse ${category}: ${displayScore} (minimum ${minimum * 100})`);
  if (typeof score !== "number" || score < minimum) failed = true;
}

if (failed) {
  console.error(`Lighthouse score threshold failed. Reports: ${jsonPath} and ${htmlPath}`);
  process.exit(1);
}

console.log(`Lighthouse audit passed. Reports: ${jsonPath} and ${htmlPath}`);
