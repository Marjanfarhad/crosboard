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
