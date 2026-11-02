# Isolated free MySQL security test database

Status: preparation only. No database provisioned, credentials created, migration executed, or production configuration changed.

## Provider gate
- Use an explicitly $0 MySQL-compatible tier only after confirming current limits, payment requirements and backup policy in the provider dashboard.
- Never enable a trial that auto-converts to paid, add a payment method, or incur usage charges.
- Database name: `crosboard_security_test`; use synthetic test users only.
- Keep all credentials in provider secret storage / local environment, never in GitHub commits or CI logs.

## Security configuration
1. Require TLS for all client connections and a separate least-privilege application user.
2. Restrict inbound network access where provider supports it; rotate generated credentials after tests.
3. Apply existing Drizzle MySQL migrations to the isolated empty test database, verifying `revoked_sessions` and unique token hash indexing.
4. Test login, logout, revoked token rejection, missing database fail-closed behavior, atomic transaction rollback, and user-data isolation.
5. Verify whether backups are included in the free tier; do not assume they are.
6. Record provider, tier, actual charge ($0), migration output, test evidence, and cleanup steps before requesting production approval.

## Production boundary
Do not update production DATABASE_URL, deploy, merge into main, copy real user data, or run migrations against production. A green mock-based CI suite is not evidence of a live database integration test.
