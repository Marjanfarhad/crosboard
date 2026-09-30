import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../dist/public/", import.meta.url).pathname;
const requiredFiles = ["index.html", "logo.svg"];

for (const file of requiredFiles) {
  const path = join(root, file);
  if (!existsSync(path) || statSync(path).size === 0) {
    throw new Error(`Missing or empty build artifact: ${file}`);
  }
}

const html = readFileSync(join(root, "index.html"), "utf8");
const requiredMarkers = [
  "CROS — Creator Revenue OS",
  "/crosboard/assets/",
  "/crosboard/logo.svg",
];

for (const marker of requiredMarkers) {
  if (!html.includes(marker)) {
    throw new Error(`Static build is missing expected marker: ${marker}`);
  }
}

console.log("Static build smoke check passed.");
