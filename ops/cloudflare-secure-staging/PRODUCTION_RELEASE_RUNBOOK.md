# Command release gate: staging manual-only; production NOT READY

Status (2026-11-13): **Secure staging can be manually authorized; production remains NOT READY**. No release was triggered by this change. Production resources are not mapped or verified.

## Known implementation
- Current deployment workflow: `.github/workflows/deploy-pages.yml`.
- Existing Cloudflare Worker: `command-app-secure-staging`; D1 name: `command-secure-staging`.
- The former hardcoded `&& false` was replaced by a staging-only `workflow_dispatch` gate. No push to `main` automatically deploys. All three jobs require `target=secure-staging`, `approval_phrase=APPROVE-STAGING-ONLY`, and repository variable `COMMAND_STAGING_DEPLOY_APPROVED_20261105=true`. This is **not** a production deployment authorization. The workflow can still run `provision.py` and change staging D1/Access if manually approved; therefore do not dispatch until backup/restore and ownership gates are met.
- `provision.py` can create/update Access configuration and apply `schema.sql` to remote D1. Its schema uses `CREATE TABLE IF NOT EXISTS` but is **not** a backup.

## Pre-release checklist (record evidence, no secrets)
1. Identify the actual **production** Worker hostname, Access application and D1 UUID. Confirm they are intentionally distinct from staging, or document an explicit promotion plan. Do not assume a staging hostname is production.
2. Verify GitHub Actions repository variable `COMMAND_STAGING_DEPLOY_APPROVED_20261105` and `COMMAND_STAGING_ALLOWED_EMAIL` via an authorized admin. Record only presence/boolean, not secrets.
3. Verify Cloudflare token scope and Access policy with read-only queries before any write. Record API response status and redacted resource identifiers.
4. Take a **remote D1 export** before migration. From a secure environment with authorized credentials, and after confirming the exact target database, run:
   ```sh
   npx wrangler@4 d1 export <CONFIRMED_PRODUCTION_DB_NAME> --remote --output ./command-d1-pre-release.sql
   sha256sum ./command-d1-pre-release.sql
   ```
   Save the export in access-controlled storage **outside the repository**, verify it is nonempty and contains expected schema/data, and record its hash and timestamp. Never commit data or tokens.
5. Record the currently serving Worker deployment version and its configuration. Confirm the ability to redeploy that exact version and restore D1 into a **separate test database**; a Worker rollback alone cannot reverse a database change.
6. Dry-run schema changes against a disposable database restored from the export; compare row counts, application behavior, Access login redirect, authorized login, session revocation, and read/write operations. Record PASS/FAIL evidence.
7. Obtain owner approval for the exact target, change set, possible downtime and rollback procedure. Do not treat a merge or a generic “go on” as approval for destructive database changes or paid services.
8. Only after gates 1–7 pass, authorize the *staging* workflow manually with its exact inputs. This is not a production release. Ensure `COMMAND_ENABLE_LIVE_AI` is not `true` for zero-budget release. For real production, define distinct resources and a separately reviewed release path.
9. Post-release verify workflow run IDs, live HTTP/Access redirects, owner login, sessions, database reads/writes, and rollback readiness. Report only observed results.

## Rollback decision
- On failed HTTP, authentication, session or data checks: stop promotion and traffic changes.
- Redeploy the recorded prior Worker version.
- If D1 changed, assess data written after the backup **before** restoring. A blind restore may delete new legitimate data. Require explicit authorization for any data overwrite or destructive restoration.
- Retain failure logs and evidence; stop further staging and production releases until resolved.

## Current missing evidence
GitHub variable value, Cloudflare admin/API access, remote D1 backup/export and test restore, production resource mapping, live post-deploy checks. The 2026-11-13 read-only checks confirmed only `command-app-secure-staging` Worker, `command-secure-staging` D1 and associated Access app; no distinct production resource mapping was verified. A local restore of an application-table backup is not a verified full D1 remote restore. No production release is authorized by this document.
