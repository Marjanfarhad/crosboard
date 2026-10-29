# Session validation repair — 2026-10-29

Source: Marjanfarhad/crosboard main, commit 0c0a1c91840ec5faebb2c48b291b39e1fca30b64, tree 7f6eb97c9a2e96419cb8bc0f9217316b14fadab7. The working copy's baseline tree was verified equal to that remote tree.

Three defects reproduced before the repair:
- A correctly signed session without exp was accepted indefinitely.
- If a verified session user was absent from the database, a different upstream openId was written before the request failed or resolved as that identity.
- A scheduled session could resolve to a different upstream openId.

The repair requires exp during JWT verification and exact identity matching before user synchronization or scheduled-user construction. Existing app-issued sessions already include exp. Correctly signed exp-less tokens will now be rejected and require login. No session lifetime, cookie policy, database schema, credentials, or account permissions were changed.

Validation: 15 unit/server tests, TypeScript, frontend build, server bundle, static artifact verification, and git diff whitespace checks passed locally. Six session regression cases include both rejection and successful matching identities. Before the repair, three negative cases failed as expected. Test sessions are synthetic; upstream identity/database calls are mocked. No live OAuth, database, cloud-sync, browser login journey, AI/video generation, or publishing was verified. No UI was changed.

This patch applies to the GitHub server SDK only. The current client entry point renders the standalone sample dashboard and does not establish an authenticated app journey. This patch does not reconcile the distinct Manus production source or implement missing business services. No production deployment, merge, publication, account change, or Notion change is part of this repair.
