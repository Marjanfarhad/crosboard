# Release readiness verification — 2026-11-01

Status: **NOT APPROVED FOR PRODUCTION**. This document is a verification plan, not evidence that checks have passed.

## Scope and known facts
- GitHub Pages CROS is a sample-data demo. User confirmed it loads on Android after suspending Base44.
- The Manus-hosted CROS Revenue and Command Analytics deployments are distinct from the GitHub checkout. Their production source and live behavior have not been reconciled.
- The GitHub server SDK requires JWT `exp` and exact `openId` matching. Six mocked regression tests exist in `server/auth.session.test.ts`.
- `signSession` defaults to `ONE_YEAR_MS`. A shorter lifetime needs a documented session policy and regression coverage.
- Neither live OAuth, persistence, secrets, backups, recovery, nor publishing permissions have been validated.

## Zero-cost release gates
- [ ] Confirm repository branch protections and required CI status checks; do not change main.
- [ ] Run `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm test:e2e`, `pnpm build:static`, `pnpm verify:static` in a disposable environment.
- [ ] Review dependency advisories and secret-scanning results without exposing any secrets.
- [ ] Verify OAuth login, logout, invalid/expired JWT, session renewal, and cookie attributes in a non-production environment.
- [ ] Confirm tenant/user isolation, authorization on every write API, rate limits, and error logging without credentials.
- [ ] Verify persistence after reload and cross-device login using non-sensitive test data; test backup and restore.
- [ ] Independently compare deployed Manus source/build with GitHub commit and document any divergence.
- [ ] Verify deployment provenance, rollback and recovery steps; ensure no paid Manus credits are required.
- [ ] Obtain explicit owner approval before merge, deployment, paid operations, or production configuration changes.

## Release decision
**BLOCKED** until each required gate has recorded executor, date, command/action, actual output, and pass/fail evidence. No simulated test passes.
