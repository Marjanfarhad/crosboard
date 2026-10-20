# AGENTS.md — running CROS in the Base44 sandbox

## How the app is wired (non-obvious bits)

- One Node process serves everything. `pnpm dev` runs `NODE_ENV=development tsx watch server/_core/index.ts`; in development mode `server/_core/vite.ts` mounts Vite in middleware mode, so Express serves the React client *and* the `/api/*` routes on a single origin (port 3000). There is no separate client dev server.
- The client is served from the Vite base `/crosboard/` (`vite.config.ts`), but the Express catch-all in `server/_core/vite.ts` answers **any** path with the transformed `client/index.html`, so the app renders at both `http://localhost:3000/` and `http://localhost:3000/crosboard/`. The preview loads `/` — that is expected and works.
- `server/_core/vite.ts` forces `allowedHosts: true` for the dev server, so the rotating sandbox hostname is accepted without editing the allowlist in `vite.config.ts`.
- `main.tsx` renders `App.tsx` directly: no router, no tRPC call, no auth gate. `useAuth` / `trpc` are only used by the unused template components (`DashboardLayout`, `ComponentShowcase`), so the dashboard is fully visible anonymously.
- Database is MySQL (Drizzle, `mysql2`). `DATABASE_URL` is read lazily in `server/db.ts`; nothing queries the DB at boot, so the UI renders even if MySQL is down. Migrations live in `drizzle/*.sql` and are applied by `pnpm db:migrate` (drizzle-kit reads `drizzle.config.ts` → `./drizzle`).

## Sandbox environment

`docker-compose.base44.yml` (Base44-only, not used by the project's own Dockerfile/CI):

- `db` — MySQL 8.4, credentials generated inline in the compose file (local infrastructure, not user secrets).
- `migrate` — one-shot `pnpm db:migrate`, ordered after the DB is healthy and before `app`.
- `app` — `node:22-bookworm-slim` + pnpm 10.18.0 via `corepack` (`Dockerfile.base44`), repo bind-mounted at `/app`, installs from the lockfile on startup and then runs `pnpm dev` on host port 3000.
- `node_modules` and the pnpm store are named volumes, so the bind-mounted checkout stays clean and `pnpm install` only syncs when the lockfile changes.

## Environment variables

- `DATABASE_URL` — required for migrations; supplied by compose (`mysql://crosboard:crosboard@db:3306/crosboard`).
- `MANUS_*` (OAuth / API / JWT secret) — **not required to boot**. `server/_core/sdk.ts` only logs `[OAuth] ERROR: MANUS_OAUTH_API_URL is not configured!` and continues; the template's Manus OAuth, LLM, image-generation and notification helpers simply stay inactive in the sandbox. No external credentials are needed to see the app working.

## Verification

```bash
docker compose -f docker-compose.base44.yml up -d --build
curl -sS http://localhost:3000/api/health          # {"status":"ok"}
curl -sS http://localhost:3000/ | head             # index.html with /crosboard/@vite/client (live dev server)
docker compose -f docker-compose.base44.yml logs app | tail
```

The served bundle must contain unhashed module URLs (`/crosboard/src/main.tsx`) — that proves the dev server is serving the cloned source, not a prebuilt bundle.

Other checks from the README that work in the sandbox:

- `pnpm check` — typecheck (run inside the `app` service).
- `pnpm test` — Vitest suite (`server/**/*.test.ts`).
- `pnpm test:e2e` — Playwright; needs `pnpm exec playwright install chromium` first, and its `webServer` builds/serves the static bundle on 4173.
