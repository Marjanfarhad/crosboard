import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  const clientTemplate = path.resolve(
    import.meta.dirname,
    "../..",
    "client",
    "index.html"
  );

  // Cache the index.html template in memory and only re-read when the file changes.
  // This reduces disk I/O for every request while still reflecting dev edits.
  let cachedTemplate: string | null = null;
  let templateVersion = "";
  let loadingTemplate: Promise<void> | null = null;

  async function loadTemplate() {
    // Prevent concurrent loads
    if (loadingTemplate) return loadingTemplate;
    loadingTemplate = (async () => {
      try {
        const stat = await fs.promises.stat(clientTemplate).catch(() => null);
        const t = await fs.promises.readFile(clientTemplate, "utf-8");
        cachedTemplate = t;
        templateVersion = String(stat?.mtimeMs ?? Date.now());
      } finally {
        loadingTemplate = null;
      }
    })();
    return loadingTemplate;
  }

  // Initial load
  await loadTemplate().catch(() => {
    // ignore errors here; we'll fallback to reading from disk per request
    cachedTemplate = null;
    templateVersion = String(Date.now());
  });

  // Watch for changes and reload the cached template.
  try {
    const watcher = fs.watch(clientTemplate, { persistent: false }, (eventType) => {
      if (eventType === "change" || eventType === "rename") {
        // schedule reload, ignore errors
        loadTemplate().catch(() => undefined);
      }
    });
    // If the watcher errors, ignore — we'll fallback to on-demand reads.
    watcher.on("error", () => {});
  } catch {
    // Ignore watch creation errors (platform restrictions)
  }

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Use cached template when available; otherwise read from disk.
      if (!cachedTemplate) {
        await loadTemplate();
      }

      // Make a local copy to inject a stable cache-busting version based on file mtime
      const template = (cachedTemplate ?? (await fs.promises.readFile(clientTemplate, "utf-8"))).replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${templateVersion || nanoid()}"`
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
