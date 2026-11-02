# Crosboard container and hosting security gate

Status: **DRAFT ONLY — NOT approved for merge or production deployment**.

## Verified Docker security comparison (GitHub Actions run 41514751501)
- Tested PR branch commit: `ccbcbaead2bff0ec5b25b287bf4313b8447d16bd`.
- Trivy JSON artifacts: GitHub Actions artifact ID `13174837734` (`docker-security-reports`).
- Both original `main` and candidate Docker images built successfully.
- Candidate ran as UID 1000 (not root), and `/api/health` smoke test passed.
- Trivy image scans completed; below are **vulnerability findings**, not unique CVEs.

| Severity | Baseline | Candidate | Difference |
|---|---:|---:|---:|
| CRITICAL | 13 | 3 | -10 |
| HIGH | 226 | 67 | -159 |
| MEDIUM | 372 | 166 | -206 |
| LOW | 113 | 97 | -16 |
| UNKNOWN | 5 | 2 | -3 |
| **TOTAL** | **729** | **335** | **-394 (54.0%)** |

### Three remaining critical findings
1. `CVE-2023-45853` — Debian `zlib1g` `1:1.2.13.dfsg-1`; scanner lists no fixed version. Review Debian advisory/exploitability and alternative base images; do not force a speculative package override.
2. `CVE-2026-25896` — `fast-xml-parser` `5.2.5`; scanner lists patched versions `5.3.5` or `4.5.4`. Identify the transitive parent and update the lockfile in a separate, tested change.
3. `CVE-2026-90711` — `proxy-addr` `2.0.7`; scanner lists fix `2.0.8`. Identify its Express dependency path and update with compatibility and lockfile tests.

## Critical remediation in progress (November 3, 2026)
- `pnpm-workspace.yaml` now overrides `fast-xml-parser` to `5.3.5` and `proxy-addr` to `2.0.8`.
- The regenerated `pnpm-lock.yaml` has verified package entries for `fast-xml-parser@5.3.5` and `proxy-addr@2.0.8`, with the older `5.2.5` and `2.0.7` entries absent.
- CI now verifies the static HTML response, unauthenticated OAuth callback rejection, and absence of both named CVEs in the built candidate. These checks must pass on the **latest** draft branch head.
- Temporary write-enabled dependency lockfile regeneration workflow was removed immediately after regenerating the pinned lockfile.
- Remaining `CVE-2023-45853` is recorded by Trivy as `will_not_fix` on Debian `zlib1g`. The advisory targets MiniZip's `zipOpenNewFileInZip4_64`, not every zlib code path. Do not claim application exploitability or apply an untested package override; check actual image/library use and alternative base images separately.
- The security scan is configured with `exit-code: 0` to produce reports; absence of the two named critical CVEs is enforced by the subsequent verification step. Other unresolved findings must be reviewed manually.

## Other verification
- GitHub CI run `41514751484`: TypeScript and unit-test steps passed; the overall run was **cancelled**, so Playwright and Lighthouse for that run are not confirmed.
- Earlier security scan (run `41513304298`) found 671 candidate vulnerabilities. The latest successful run found 335, a further reduction of 336 findings in this specific scan.
- The production candidate currently separates Vite development imports from production static serving and installs only production pnpm dependencies.

## Required gates before merge or deployment
1. Verify no new runtime failures: static asset serving, protected tRPC routes, OAuth callback, session expiry, real MySQL connectivity, using **non-production** credentials.
2. Review all remaining CRITICAL findings and HIGH findings for fixes or written risk acceptance; re-run a versioned vulnerability scan and review JSON artifacts.
3. Complete full **uncancelled** CI checks including TypeScript, unit tests, Playwright and Lighthouse.
4. Pin verified base images and GitHub Actions to reviewed digests; inspect image history and build context for secrets.
5. Define database backups, rollback procedure, and deployment security controls. **Do not run production migrations in tests.**

## Application architecture limitations
- GitHub Pages serves only the static frontend (`dist/public`), not Express/tRPC, MySQL, or Manus OAuth.
- The database schema currently defines only the `users` table.
- Existing OAuth session lifetime is one year; evaluate shortening and revocation before an Internet-facing backend rollout.
- Successful container smoke tests do **not** verify live OAuth, persistence, or the end-to-end authenticated application.

## Change policy
Permitted: read-only inspections, reversible draft-branch edits, and non-production tests without publishing.
Require a new explicit approval: merging to main, production deployment, production DB modifications or migrations, DNS/secrets changes, billing, paid resource use, or external publication.
