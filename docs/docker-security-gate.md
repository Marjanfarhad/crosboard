# Crosboard container and hosting security gate

Status: **NOT approved for production deployment or merge**.

## Evidence checked
- GitHub PR #9 adds a multi-stage Node 22 Dockerfile, a non-root runtime user and an HTTP healthcheck.
- GitHub CI run 41511179162 for the initial Docker hardening commit completed successfully. **That CI does not establish a Docker image build or CVE scan.**
- GitHub Pages deployment workflow publishes only `dist/public`; it does not deploy the Express API or MySQL database.
- Current server uses Express/tRPC and MySQL (Drizzle); Manus OAuth environment variables are required for existing login flow.
- The draft branch now separates production static serving from Vite development imports and installs production dependencies in a separate Docker stage. These changes require a successful Docker build, smoke test, and CVE scan before approval.

## Verification required before merge or deployment
1. Build the previous `main` image and the PR image on an isolated runner. Do not provide real credentials.
2. Run each container without privileged mode; check UID (`id -u`) and that `/api/health` returns HTTP 200.
3. Verify static asset routing, OAuth callback, session expiry/identity protection, API access control, and actual MySQL connectivity using non-production credentials.
4. Run a vulnerability scanner (e.g. Trivy) against both built image digests, record the scanner DB timestamp, severity counts and unfixed/fixed distinctions; compare like-for-like results.
5. Ensure `docker history` and the build context contain no secrets. Pin reviewed base-image digests.
6. Evaluate dependency pruning and Node LTS support using an actual runtime smoke test.
7. Confirm production rollback procedures and DB backups. Do not run migrations against production during testing.

## Known limitations and risks
- Docker Image CVE reduction is **unverified**; multi-stage alone is not proof of CVE reduction.
- New proposal installs `node_modules` with `pnpm install --prod --frozen-lockfile`; verify no runtime module is missing and compare the resulting scanner findings.
- Current database schema contains only a `users` table; do not infer complete persistent business functionality from the dashboard.
- The current OAuth callback sets a session with a one-year lifetime; evaluate shorter sessions and revocation before Internet-facing backend deployment.
- GitHub Pages frontend is independent of this Dockerfile. Merging a container change cannot by itself activate the API, database or login in the static site.

## Change policy
Allowed without additional approval: read-only inspections, reversible draft-branch edits, tests that use mock/non-production data, documenting results.
Require explicit separate approval: production deployment, merges to main, DNS/secrets changes, production database writes/migrations, billing or paid service activation, external publication.
