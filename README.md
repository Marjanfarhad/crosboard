# CROS — Creator Revenue OS

[![CI](https://github.com/Marjanfarhad/crosboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Marjanfarhad/crosboard/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/Marjanfarhad/crosboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Marjanfarhad/crosboard/actions/workflows/deploy-pages.yml)
[![Live site](https://img.shields.io/badge/live_site-CROS-c8f35a?logo=github&logoColor=10110f)](https://marjanfarhad.github.io/crosboard/)

A polished creator revenue dashboard inspired by the supplied CROS reference project. The interface includes a workspace sidebar, revenue metrics, product portfolio, interactive chart ranges, next-move checklist, search command palette, and responsive mobile layout.

**Live site:** [marjanfarhad.github.io/crosboard](https://marjanfarhad.github.io/crosboard/)

## Development

This is a React / Express / tRPC / Drizzle project adapted from the Sandbox web-db-user template.

```bash
pnpm install
pnpm dev
```

Useful commands:

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm dev:static`: static Vite preview server for the frontend.
- `pnpm build`: build the frontend and production server.
- `pnpm build:static`: build the static GitHub Pages bundle.
- `pnpm start`: serve the production build from `dist/`.
- `pnpm check`: run TypeScript diagnostics.
- `pnpm test`: run the Vitest test suite once.
- `pnpm test:e2e`: run Playwright interaction and visual regression tests.
- `pnpm verify:static`: verify the expected static build artifacts exist.
- `pnpm db:migrate`: apply checked-in migrations.
- `pnpm db:push`: generate and apply new schema changes.

## CI/CD

Every push to `main` and every pull request targeting `main` runs [CI](.github/workflows/ci.yml), which:

1. Installs dependencies with the locked pnpm version.
2. Runs TypeScript typechecking.
3. Runs the automated Vitest test suite.
4. Builds the static site.
5. Verifies that the expected Pages artifacts exist.

Every push to `main` also runs the [GitHub Pages deployment workflow](.github/workflows/deploy-pages.yml). Deployment is gated by the same typecheck, test, and build checks before the artifact is published.

## Project notes

- `client/src/App.tsx` contains the self-contained dashboard experience and local interaction state.
- `client/src/index.css` contains the CROS dark editorial design system and responsive layout.
- `client/public/logo.svg` is the project icon and favicon.
- `ideas.md` records the visual direction used for the implementation.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.
