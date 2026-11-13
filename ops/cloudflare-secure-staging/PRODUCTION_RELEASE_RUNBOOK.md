# Command release gate: staging manual-only; production NOT READY

Status (2026-11-13): **Secure staging can be manually authorized; production remains NOT READY**. No release was triggered by this change. Production resources are not mapped or verified.

## Known implementation
- Current deployment workflow: `.github/workflows/deploy-pages.yml`.
- Existing Cloudflare Worker: `command-app-secure-staging`; D1 name: `command-secure-staging`.
- The former hardcoded `&& false` was replaced by a staging-only `workflow_dispatch` gate. No push to `main` automatically deploys. All three jobs require `target=secure-staging`, `approval_phrase=APPROVE-STAGING-ONLY`, and repository variable `COMMAND_STAGING_DEPLOY_APPROVED_20261105=true`. This is **not** a production deployment authorization. The workflow can still run `provision.py` and change staging D1/Access if manually approved; therefore do not dispatch until backup/restore and ownership gates are met.
- `provision.py` can create/update Access configuration and apply `schema.sql` to remote D1. Its schema uses `CREATE TABLE IF NOT EXISTS` but is **not** a backup.


## Separate production environment design (prepared, NOT created)

Read-only Cloudflare inventory on 2026-11-13: account `Caring Philodendron` (`c07d8b1ea34ea6df240f291062a5ec1f`) has Worker `command-app-secure-staging`, D1 `command-secure-staging`, and Access application `Command secure staging`. The existing deployment workflow targets staging exclusively. The account's actual paid/free billing entitlement and GitHub billing settings **were not verified**.

Proposed isolated resources, subject to explicit cost and owner approval:

| Resource | Proposed production name | Safety rule |
| --- | --- | --- |
| Worker | `command-app-production` | Never overwrite `command-app-secure-staging`; deploy only from a reviewed, production-specific workflow |
| D1 | `command-production` | New empty D1 with separately applied schema; do not bind to `command-secure-staging` or import real staging user data by default |
| Access | `Command production owner only` | Exact hostname `command-app-production.caring-philodendron.workers.dev`; deny-by-default, initially one verified owner email and separate production audience |
| GitHub environment | `command-production` | Required reviewers / branch restriction; no staging credentials or deployment triggers reused |
| AI | disabled | No paid model calls, secret propagation, or live AI until expressly approved |

**Cost preflight:** Cloudflare documents a Free Workers allowance of 100,000 requests/day and up to 100 Workers, and D1 Free up to 10 databases and 5 GB of total storage. These are **plan limits, not proof this account has zero billing liability**. Confirm actual Cloudflare plan, existing resource utilization, any paid subscriptions, GitHub Actions billing, and spend safeguards *before* creating these resources. Do not enable paid plans, add payment methods, or allow overages.

**Isolated production build sequence (not yet run):**
1. Independently verify billing and account owner; reserve isolated names without provisioning anything. Verify the exact production owner email privately (never commit it), and the intended public hostname.
2. Correct and retest staging code safely: current `provision.py` requires exactly one Access policy, while the live staging Access application currently has **two** allow policies. Therefore its remote provisioning step would fail on the current state; do not force the existing staging workflow.
3. Verify full export to an independently stored SQL artifact and restore into a **separate isolated test DB**; local application-table SQLite restore does not cover the internal `_cf_KV` table or remote D1 restore.
4. Create a dedicated production configuration and workflow that is **manual-only**, fail-closed for production resource IDs, owner approval, and `AI_ENABLED=false`. Never replace staging bindings through string substitution at deploy time.
5. Provision a new empty production D1 and minimal Access app/Worker only after billing and security checks. Record immutable IDs privately and apply schema without copying account/user rows.
6. Confirm anonymous requests redirect to Cloudflare Access; sign in with an authorized production owner; test user session, persistence, token expiry, and logout; test rollback by restoring the previous Worker version while retaining user data.
7. Obtain explicit owner sign-off on the exact production target URL, costs, and any migration of user data before routing real traffic. A staging deployment is not production promotion.

**Current release gates:** environment isolated = FAIL (not created); actual billing reviewed = UNKNOWN; full remote restore tested = FAIL; authorized login E2E = FAIL; recent GitHub CI = needs verification. No production dispatch or provisioning is authorized by this runbook.

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
