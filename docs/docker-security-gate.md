# Crosboard container security review — final draft validation

**Status: DRAFT. NOT approved for merge or deployment.**

## Scope and verified evidence
- Repository: `Marjanfarhad/crosboard`; review branch: `security/docker-runtime-hardening-20261103`; Draft PR #9.
- Candidate container test commit: `11b0ff7d1df9c72ef9aabcf5f049abf10818cbe3`.
- GitHub Docker scan: run `41549518408`; Trivy report artifact `13190915755`. Both baseline and candidate image builds, non-root UID, health/static/OAuth-input smoke tests, production npm tooling exclusion, and scans passed.
- Full GitHub CI: run `41549518411`; TypeScript/unit tests, Playwright end-to-end tests, Pages build and Lighthouse all passed.
- Latest isolated database CI: Docker run `41550042077` completed successfully. An ephemeral MySQL 8.4 container with disposable credentials accepted a `SELECT 1` query issued through the candidate image's `mysql2/promise` and `drizzle-orm/mysql2` runtime libraries; this does **not** validate production data, migrations, or authenticated CRUD.
- Latest full CI on the same application code: run `41550041985`; all three jobs (TypeScript/unit, Pages build/Lighthouse, Playwright) completed successfully.
- Scanner counts below are vulnerability **findings**, not unique CVE IDs; both images were scanned in the same workflow.

| Severity | Baseline | Candidate | Difference |
|---|---:|---:|---:|
| CRITICAL | 13 | 1 | -12 |
| HIGH | 226 | 32 | -194 |
| MEDIUM | 372 | 115 | -257 |
| LOW | 113 | 87 | -26 |
| UNKNOWN | 5 | 2 | -3 |
| **TOTAL** | **729** | **237** | **-492 (67.5%)** |

## Implemented hardening
1. Separate build, production-dependencies, and final runtime Docker stages; use the unprivileged `node` user and explicit Node startup command.
2. Keep Vite development integration out of production server imports; install production-only dependencies in the final runtime tree.
3. Remove global npm/npx/Corepack CLI and bundled packages from the **final runtime image only** (builders still have package tooling). The CI test asserts they are absent.
4. Add Docker build-context exclusions for local secrets, credentials, logs and database files.
5. Update and regenerate lockfile for patched `fast-xml-parser`, `proxy-addr`, `axios`, `mysql2`, `nanoid`, tRPC/Drizzle and other compatible libraries. A temporary write-enabled lockfile update workflow was used and **deleted** afterwards.
6. Add CI comparison against the main baseline, runtime non-root and HTTP checks, and explicit exclusion checks for `CVE-2026-25896` and `CVE-2026-90711`.

## Additional verification — OAuth boundaries and isolated DB CRUD
- New `server/oauth.callback.test.ts` exercises six **synthetic/mock** OAuth callback scenarios: missing parameters, mismatched nonce, absent nonce cookie, successful mock exchange and secure session cookie, missing upstream user ID, and failed persistence. These tests do not contact the Manus provider.
- Draft commit `d027497cc6bcc86d498164d4bc4eb534a12dc7a1` passed full GitHub CI run `41551395267` (TypeScript/unit, browser Playwright, Pages/Lighthouse).
- Docker security run `41551395374` passed; it exercised temporary MySQL 8.4/Drizzle **insert, upsert, query and delete** in a disposable database, in addition to the existing container and CVE checks. No production DB or real user records were touched.
- Latest Trivy artifact `13193540343` confirms `729 → 237` findings (CRITICAL `13 → 1`; HIGH `226 → 32`; MEDIUM `372 → 115`; LOW `113 → 87`; UNKNOWN `5 → 2`). All remaining Critical/High records are reported under Debian system packages.
- This is evidence of the candidate runtime and synthetic security boundary behavior, **not** evidence of successful live user login, production migrations or working real-world data persistence.

## Outstanding vulnerabilities
- **One CRITICAL** finding: `CVE-2023-45853`, Debian `zlib1g` (`1:1.2.13.dfsg-1`), reported `will_not_fix` by Trivy. The advisory relates to a MiniZip code path. Whether the application can reach that path is **not established**; avoid claiming either exploitability or safety without runtime provenance review.
- **32 HIGH** findings are associated with system libraries/packages in the Debian base image. These are not the same as the previously fixed application-level Node.js dependency findings.
- Further image-family migration (e.g. a vetted hardened or distroless image), OS package upgrades, or formal acceptance of unfixable findings requires a new isolated build/test and security review. Do not assume a smaller scan number implies compatibility.

## Deployment / release blockers (not yet verified)
1. End-to-end authenticated user login and OAuth callback against the **actual** provider, including session expiry/revocation and protected API access. Existing smoke test only checks missing callback parameters return 400.
2. Application's real user-schema migrations and real authenticated app-level persistence require a separate staging integration test. Disposable MySQL/Drizzle insert-upsert-query-delete has passed, but does not confirm actual production schema or user data.
3. Source reconciliation with the previously deployed Manus instance, plus DNS/hosting origin/route review. GitHub Pages serves static assets, not the Node API or MySQL.
4. Production configuration and secrets isolation, container image provenance and pinning by digest, recovery and rollback, and verified backups.
5. Review or document acceptance/mitigations for the remaining 1 CRITICAL and 32 HIGH findings before release.

## Guardrails
- No `main` merge, production deployment, billing change, DNS edit, external publication, or production DB migration was performed.
- Preserve Draft PR #9 for owner review. Require explicit approval before any production changes.
- Future test runs should use synthetic or non-production credentials only; do not expose real secrets in Actions artifacts.

## New interactive session policy — draft branch only
- The OAuth callback now issues seven-day sessions using `ONE_WEEK_MS`; the matching cookie Max-Age and JWT expiry are derived from the same duration.
- A regression test asserts the shorter token and cookie lifetime with mocked provider and user persistence.
- Already-issued one-year sessions remain valid until their signed `exp` after deployment unless an explicit revocation plan is implemented.
- No server-side session revocation is implemented. This remains a release gate for elevated-risk deployments; never claim cookie clearing revokes an already stolen token.
- Live Manus OAuth callback and user database schema/migrations remain unverified against the actual production environment.
