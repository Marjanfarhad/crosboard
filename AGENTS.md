# Base44 Dev Environment

## Stack
React 19 + Vite 7 (middleware mode) + Express + tRPC + Drizzle ORM (MySQL). Single-origin: Express serves both the API (`/api/*`) and the Vite dev server on port 3000.

## Running
```
docker compose -f docker-compose.base44.yml up -d
```
- `db` — MySQL 8.0 (healthcheck via `mysqladmin ping`).
- `app` — `node:22-bookworm-slim`, source bind-mounted at `/app`. Installs deps via corepack/pnpm on startup, runs `pnpm db:migrate`, then `pnpm dev` (tsx watch with live reload).
- Health: `GET /api/health` → `{"status":"ok"}`.

## Vite base path
`vite.config.ts` sets `base: "/crosboard/"`. All dev assets are served under `/crosboard/...` — Vite middleware strips the prefix. The Express catch-all serves `client/index.html` at all other paths and `vite.transformIndexHtml` rewrites the script tags.

## Environment
- `DATABASE_URL` — set inline in compose (local MySQL). Not a user secret.
- `MANUS_JWT_SECRET` — dev placeholder in `.env.base44-defaults`; override via dashboard for real sessions.
- `MANUS_*` platform credentials (OAuth, Forge API) — external Manus platform services. The app boots and renders the dashboard UI without them; auth, storage, AI, and heartbeat features require them. Provide via the Base44 secrets dashboard.
- Secret precedence: `.env.base44-defaults` (placeholders) → `/run/base44/app.env` (dashboard, always wins).

## Migrations
`pnpm db:migrate` runs `drizzle-kit migrate` (MySQL). Applied automatically on container startup. Migration SQL is idempotent (`CREATE TABLE IF NOT EXISTS`).

## Verification
1. `curl localhost:3000/api/health` → `{"status":"ok"}`
2. `curl localhost:3000/` → HTML with `/crosboard/@vite/client` (dev server active)
3. Preview should show the CROS dashboard (static, no auth required)
