# Login/logout security review candidate — 2026-11-01

Status: **DRAFT — NOT APPROVED FOR PRODUCTION**.

## Implemented on this branch
- New OAuth sessions and their HttpOnly cookies have a maximum lifetime of 8 hours rather than one year.
- The SDK rejects invalid, zero, negative, or longer requested session lifetimes.
- Unit regression coverage added for bounded session creation.
- Existing logout route clears the session cookie; no production logout flow was exercised.

## Security limitations / release blockers
- Clearing a cookie is **not** server-side JWT revocation. Previously copied tokens, and preview Bearer tokens, may remain valid until expiration. Implement token/session revocation or an equivalent server-side invalidation mechanism before claiming immediate logout.
- Confirm the login initiation flow, callback CSRF protection, cookie flags and cross-site behavior in a non-production environment.
- Test login, logout, back-button, refresh, and protected API requests with expired and revoked tokens.
- Validate cross-user isolation and persistence using non-sensitive test data.
- The deployed Manus CROS Revenue application is not reconciled to this GitHub source.
- The GitHub client dashboard uses fictional fixtures; this PR does not introduce production account UI, identity provider credentials, or a live database.
- No CI results are claimed until GitHub Actions completes on this branch.

Do not merge, deploy, or change billing, secrets, or production without explicit owner approval.

## Immediate logout revocation implementation (review candidate)
- A shared MySQL table `revoked_sessions` stores only SHA-256 token hashes and expiration timestamps.
- The logout mutation first persists a revocation, then clears the HttpOnly session cookie. A storage failure returns an error and does not falsely report successful logout.
- Each JWT verification checks the shared store and rejects revoked sessions; lookup failures fail closed.
- New mocked unit tests cover revocation, invalid tokens, and storage outage. CI and live integration tests are not yet verified.
- **Required schema migration before any server rollout:** create `revoked_sessions` through the repository's Drizzle migration workflow, review generated SQL, test on a disposable database, and back up before any production migration. The branch changes schema only; no migration has run.
- **Known limitation:** a Bearer token and a different cookie token in the same browser may represent different sessions. Logout invalidates the presented cookie first. Audit preview token storage and ensure all active tokens are revoked or removed when signing out.
- **Security gate:** test concurrent logout and requests, cross-instance revocation, session expiration, migration/rollback, and a simulated database outage before deployment.
