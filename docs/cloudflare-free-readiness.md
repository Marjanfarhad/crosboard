# Cloudflare Free deployment readiness (staging only)

## Verified from repository
- Frontend: React + Vite; static output is `dist/public` (`pnpm build:static`).
- Vite currently sets `base: '/crosboard/'` for GitHub Pages. A Cloudflare root-domain deployment needs an explicit root base override; do not deploy the existing build at `/` unchanged.
- Backend: Express/tRPC on Node, with MySQL/Drizzle. Static hosting alone does **not** provide login, server APIs, or database persistence.
- The dashboard includes sample/demo revenue and product values. Do not present them as live production data.

## Proposed zero-cost staging sequence (not executed)
1. Add a Cloudflare-specific Vite build command using `--base=/` without changing the GitHub Pages build.
2. Run TypeScript, unit tests, static build and static verification; inspect output for absolute `/crosboard/` paths and any server-only secrets.
3. Deploy **only** to a separate Cloudflare staging project after confirming the account's free-plan limits and deployment permissions; do not overwrite `command-app-preview`.
4. Smoke-test routes, assets, accessibility and responsive UI. Label preview as demo/no live data.
5. Design and test authenticated API and database separately. Never copy production credentials or run migrations before source-of-truth, backup, and rollback verification.

## Release gates
- No paid plan, credit purchase, production modification, external publication, or database migration without explicit authorization.
- Do not claim full Command functionality until authenticated backend and durable database are tested end-to-end.
- Existing Cloudflare `command-app-preview` error root cause remains unverified without logs.
