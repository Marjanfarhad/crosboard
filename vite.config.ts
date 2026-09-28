import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { publicPlatformScript } from "./server/_core/publicConfig";

// =============================================================================
// Manus Debug Collector - Vite Plugin (async, batched writer + rotation)
// - Batches incoming browser logs in memory and flushes periodically (non-blocking)
// - Rotates files when size exceeds MAX_LOG_SIZE_BYTES
// - Safer for dev server: reduces sync I/O and prevents blocking the event loop
//
// Configuration via environment variables (all optional):
// MANUS_LOG_MAX_BYTES (number, bytes) - default 1_048_576 (1MB)
// MANUS_LOG_FLUSH_INTERVAL_MS (number, ms) - default 250
// MANUS_LOG_ROTATE_COUNT (number, count) - default 3
// MANUS_LOG_MAX_PAYLOAD_BYTES (number, bytes) - default 1_048_576 (1MB)
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");

function envInt(name: string, fallback: number) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && !Number.isNaN(v) && v > 0 ? Math.floor(v) : fallback;
}

let MAX_LOG_SIZE_BYTES = envInt("MANUS_LOG_MAX_BYTES", 1 * 1024 * 1024); // 1MB per log file
let FLUSH_INTERVAL_MS = envInt("MANUS_LOG_FLUSH_INTERVAL_MS", 250); // flush queued logs every 250ms
let LOG_ROTATE_COUNT = envInt("MANUS_LOG_ROTATE_COUNT", 3); // keep rotated files .1 .. .3
let MAX_PAYLOAD_BYTES = envInt("MANUS_LOG_MAX_PAYLOAD_BYTES", 1 * 1024 * 1024); // 1MB max incoming payload

// allow hot-reload of env-driven values in dev if needed (not required, but safe)
if (process.env.MANUS_LOG_MAX_BYTES) MAX_LOG_SIZE_BYTES = envInt("MANUS_LOG_MAX_BYTES", MAX_LOG_SIZE_BYTES);
if (process.env.MANUS_LOG_FLUSH_INTERVAL_MS) FLUSH_INTERVAL_MS = envInt("MANUS_LOG_FLUSH_INTERVAL_MS", FLUSH_INTERVAL_MS);
if (process.env.MANUS_LOG_ROTATE_COUNT) LOG_ROTATE_COUNT = envInt("MANUS_LOG_ROTATE_COUNT", LOG_ROTATE_COUNT);
if (process.env.MANUS_LOG_MAX_PAYLOAD_BYTES) MAX_PAYLOAD_BYTES = envInt("MANUS_LOG_MAX_PAYLOAD_BYTES", MAX_PAYLOAD_BYTES);

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

async function ensureLogDirAsync() {
  try {
    await fs.promises.mkdir(LOG_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

async function rotateIfNeeded(logPath: string) {
  try {
    const stat = await fs.promises.stat(logPath).catch(() => null);
    if (!stat) return;
    if (stat.size <= MAX_LOG_SIZE_BYTES) return;

    // rotate files: log -> log.1, log.1 -> log.2, etc.
    for (let i = LOG_ROTATE_COUNT - 1; i >= 0; i--) {
      const from = i === 0 ? logPath : `${logPath}.${i}`;
      const to = `${logPath}.${i + 1}`;
      try {
        await fs.promises.rename(from, to);
      } catch {
        // ignore missing files
      }
    }
  } catch {
    // ignore rotation errors in dev
  }
}

// In-memory buffers for each source. Fast, synchronous push for incoming requests.
const buffers: Record<LogSource, string[]> = {
  browserConsole: [],
  networkRequests: [],
  sessionReplay: [],
};
let flushing = false;

function enqueueLogLines(source: LogSource, entries: unknown[]) {
  if (!entries || entries.length === 0) return;
  const lines = entries.map((entry) => `[${new Date().toISOString()}] ${JSON.stringify(entry)}`);
  buffers[source].push(...lines);
}

async function flushBuffersOnce() {
  if (flushing) return;
  flushing = true;
  try {
    await ensureLogDirAsync();
    const sources: LogSource[] = ["browserConsole", "networkRequests", "sessionReplay"];
    for (const source of sources) {
      const queued = buffers[source].splice(0, buffers[source].length);
      if (queued.length === 0) continue;

      const logPath = path.join(LOG_DIR, `${source}.log`);
      const data = queued.join("\n") + "\n";
      const dataBytes = Buffer.byteLength(data, "utf-8");

      try {
        // Check current size and rotate if appending would exceed limit
        const stat = await fs.promises.stat(logPath).catch(() => null);
        if (stat && stat.size + dataBytes > MAX_LOG_SIZE_BYTES) {
          await rotateIfNeeded(logPath);
        }

        // Append data (async)
        await fs.promises.appendFile(logPath, data, "utf-8");

        // Post-append safety: if file grew beyond limit, rotate
        const newStat = await fs.promises.stat(logPath).catch(() => null);
        if (newStat && newStat.size > MAX_LOG_SIZE_BYTES) {
          await rotateIfNeeded(logPath);
        }
      } catch (e) {
        // If append fails, requeue lines to avoid data loss during transient errors
        buffers[source].unshift(...queued);
      }
    }
  } finally {
    flushing = false;
  }
}

// Periodic flush timer (dev-only, lightweight)
let flushTimer: NodeJS.Timeout | null = null;
function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    // fire and forget
    flushBuffersOnce().catch(() => undefined);
  }, FLUSH_INTERVAL_MS);
}
startFlushTimer();

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written to in-memory queue then flushed async
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (queued in memory and flushed async)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          try {
            if (payload.consoleLogs?.length > 0) {
              enqueueLogLines("browserConsole", payload.consoleLogs);
            }
            if (payload.networkRequests?.length > 0) {
              enqueueLogLines("networkRequests", payload.networkRequests);
            }
            if (payload.sessionEvents?.length > 0) {
              enqueueLogLines("sessionReplay", payload.sessionEvents);
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        // Stream and enforce size limit
        let received = 0;
        const chunks: Buffer[] = [];
        let closed = false;

        const onData = (chunk: Buffer) => {
          if (closed) return;
          received += chunk.length;
          if (received > MAX_PAYLOAD_BYTES) {
            closed = true;
            try {
              res.writeHead(413, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, error: "Payload too large" }));
            } catch {}
            try {
              (req as any).destroy?.();
            } catch {}
            return;
          }
          chunks.push(Buffer.from(chunk));
        };

        const onEnd = () => {
          if (closed) return;
          closed = true;
          const body = Buffer.concat(chunks).toString();
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            try {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, error: String(e) }));
            } catch {}
          }
        };

        const onError = () => {
          if (closed) return;
          closed = true;
          try {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: "Request error" }));
          } catch {}
        };

        req.on("data", onData);
        req.on("end", onEnd);
        req.on("error", onError);
      });
    },
  };
}

function vitePluginPublicPlatformConfig(): Plugin {
  return {
    name: "manus-public-platform-config",
    configureServer(server) {
      server.middlewares.use("/api/platform/config.js", (_req, res) => {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Cache-Control", "no-store");
        res.end(publicPlatformScript());
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "api/platform/config.js", source: publicPlatformScript() });
    },
  };
}

const plugins = [vitePluginPublicPlatformConfig(), react(), tailwindcss(), jsxLocPlugin(), vitePluginManusDebugCollector()];

export default defineConfig({
  plugins,
  base: "/crosboard/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

// Graceful shutdown: flush buffers on SIGINT/SIGTERM/beforeExit
let shuttingDown = false;
async function flushAndExit(signal?: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    console.log(`manus-logs: received ${signal ?? "shutdown"} - flushing log buffers...`);
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    // attempt to flush remaining buffers
    await flushBuffersOnce();
    console.log("manus-logs: flush complete");
  } catch (e) {
    console.error("manus-logs: error while flushing buffers:", e);
  } finally {
    // give a short grace period then exit
    setTimeout(() => {
      try {
        process.exit(0);
      } catch {
        /* ignore */
      }
    }, 500);
  }
}

process.once("SIGINT", () => flushAndExit("SIGINT"));
process.once("SIGTERM", () => flushAndExit("SIGTERM"));
process.once("beforeExit", () => flushAndExit("beforeExit"));
