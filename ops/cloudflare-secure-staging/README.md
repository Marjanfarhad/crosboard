# Secure Command staging candidate

Not deployed. This is separate from the existing recovery Worker and PR #9.
Live AI routes are disabled in code. Do not treat the health endpoint as a database test.

## Deployment prerequisites

- The supplied command-cloudflare.zip frontend is now in public/index.html. It matches command-app-deploy.zip byte-for-byte before adaptation. It is not confirmed to be the separately named Recovery Staging Candidate ZIP. The React workspace is a different source and has not been substituted. Confirm this standalone frontend is the intended staging version before publishing.
- The standalone frontend now loads /api/account and /api/workspace before rendering, serializes cloud saves, sends x-command-account on writes, and pauses edits on failure/conflict with an unsaved-data download. PUT requires that account header to equal the verified JWT subject. No simulated login or TikTok connection remains. Browser verification is still required.
- Load cloud data before enabling edits. Clear in-memory account data on sign-out or account changes; do not automatically upload unscoped localStorage from a previous account. Do not mark a failed save as synced.
- Obtain Cloudflare credentials through the environment's secure configuration, not chat or source code. No credentials are included here.
- Confirm the current Free-plan D1 limits and any billable choice before provisioning. Use a new staging database; never migrate an existing production binding.

## Provision and deploy after prerequisites are satisfied

1. Copy wrangler.example.json to wrangler.json. Keep the separate Worker name. Create command-secure-staging with `wrangler d1 create command-secure-staging`; put the actual returned database ID into wrangler.json.
2. Configure a Cloudflare Access self-hosted application covering the entire new staging hostname. Use an explicit tester allow policy and no bypass rule. Configure the login method and copy that application's AUD into ACCESS_AUD. The issuer comes from the reported Zero Trust team and must be verified against the active account.
3. Apply the schema only to the new database: `wrangler d1 execute command-secure-staging --remote --file schema.sql --config wrangler.json`.
4. Run `node --test api.test.mjs worker.test.mjs` from this directory, then `wrangler deploy --dry-run --config wrangler.json` and inspect the asset list and bindings. Deploy only the inspected candidate with `wrangler deploy --config wrangler.json`.

All asset requests run through the Worker first. The Worker requires a valid Access JWT even on direct or preview requests. This is defense in depth; the Access application must still protect the published hostname and issue the login session. Preview URLs are disabled.

## Required live verification

Use two independent browser sessions with two tester identities. Verify anonymous root, nested assets, /api/account, and /api/workspace cannot expose app data. Save different products/videos in each account, refresh, sign out/in, and verify persistence and isolation on a second device. Test competing revisions return 409 without losing data, rejected tokens, denied users, and temporary database failure. Confirm AI routes remain disabled. Record exact deployed version, hostname, binding IDs, results, and rollback version before claiming completion.

Local tests use generated signing keys and SQLite behind a D1-shaped adapter. They do not verify Cloudflare Access configuration, live D1, browser cloud sync, or deployment.
