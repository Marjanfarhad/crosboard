# PR #12 → PR #16 security reconciliation (review-only)

Date: 2026-11-05. This document records a read-only comparison of commit `06f67421157988b46d5309e53bf875f23dda671f` (PR #12 snapshot) and `ea7be03a5301cf23839b29ef047ff6a8d07e62e0` (PR #16 snapshot). No production approval is implied.

## Confirmed by GitHub file blob SHA

- `ops/cloudflare-secure-staging/api.test.mjs`: identical in both snapshots (`6fe6b4a64302f541e495ba24ff69de9190543b4b`). The overlapping-cookie test is already present in PR #16.
- `ops/cloudflare-secure-staging/worker.test.mjs`: identical in both snapshots (`6463759cd1b247523d05f194d56c27033687d1a2`). Login-loop and signing-key-failure tests are already present in PR #16.
- `ops/cloudflare-secure-staging/worker.mjs` at PR #16 already includes the one-attempt redirect guard, error page, and `hasAccessCredential` import shown in PR #12's patch. This is a content observation, not a complete blob equality claim.
- PR #16 `api.mjs` includes bounded cookie candidate parsing, Access JWT verification, JWKS timeout, and ambiguous identity rejection. Detailed semantic equivalence to PR #12 has not yet been established.

## Outstanding review gates

1. Verify the complete `api.mjs` and `deploy-pages.yml` line-by-line semantics against PR #12 and the intended branch/event deployment policy.
2. Confirm whether PR #12's `client/src/App.tsx` and `client/src/lib/sampleChart.ts` changes are necessary and should be carried forward; do not copy blindly.
3. Run CI on any actual code change, check GitHub mergeability, and independently verify live Cloudflare Access, D1 restore, and deployed source before production release.

No merge, deployment, credential, or database changes are authorized by this record.
