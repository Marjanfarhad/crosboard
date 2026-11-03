# Cloudflare Worker recovery candidate

Not deployed. This directory records a focused repair for the existing command-app-preview mock Worker, not the Crosboard Express/MySQL server.

Observed active version prefix: 27a3272b. Root preview throws TypeError at env.ASSETS.fetch because no ASSETS binding is configured. Production settings list no runtime variables, secrets or bindings and no connected Git repository. An every-30-minute cron trigger exists, but the inspected module has no scheduled export. The trigger's actual failure logs were not retrieved, so this is a configuration mismatch, not a proven explanation for all errors.

worker.mjs preserves the inspected mock APIs, guards the missing assets binding with HTTP 503 and reports mock/AI/auth/persistence status honestly. It does not restore the missing frontend, add authentication, persist records, implement scheduled work, or deploy PR #9. Do not call this a working application.

Validation: node --test ops/cloudflare-recovery/worker.test.mjs — 4 tests passed locally. Covers absent/malformed assets, truthful readiness, original-request forwarding to a supplied assets binding, and preserved mock route behavior. No cloud/database/provider calls.

To restore the application: recover the original frontend asset bundle and deployment configuration; establish its actual source; supply ASSETS through an asset deployment; decide whether the obsolete cron is removed or a real scheduled job is required; and provision a separate compatible Node/MySQL staging target for PR #9 with provider callback configuration. Do not put credentials in this directory. Keep original deployed version available for rollback. No paid resource has been selected or purchased.
