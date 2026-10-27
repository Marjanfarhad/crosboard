# Website review candidate — 2026-10-28

## Source and deployment boundary

- Source repository: `Marjanfarhad/crosboard`.
- Base commit: `b95f5b197b0cedd886974ae3f67a2cce038cf513`.
- Review branch: `fix/website-review`.
- The Notion Digital product project points to `https://crosrevenue-9fdtk8rn.manus.space/`.
- README separately points to GitHub Pages. `Command — Secure Workspace` is a separate Sites project.
- These versions are not interchangeable. The audited Manus site has a Google Analytics panel absent from this GitHub checkout. Do not replace Manus or Secure Workspace wholesale with this branch.
- No deployment, merge, production data change, analytics connection or authentication change is authorized by this candidate. Reconcile the production source and obtain the owner's approval before release.

## Changes and remaining boundaries

| Finding | Candidate change | Boundary |
| --- | --- | --- |
| Navigation only changed the selected name | Products, Studio, Performance and Analyst show distinct content | Studio is a clearly labelled sample review screen; production video operations are not implemented |
| Search had no useful destination | Product-title results open Products and focus the selected card | Search covers in-session product titles only |
| Demo revenue appeared live | Prominent sample banner; session-only behavior and unavailable integrations explained | No cloud sync added; reload intentionally resets fixture edits |
| Conflicting ready/edit statuses | Studio sample says Needs edits; review checklist cannot publish or approve | No real video asset exists in this source version |
| Chart period and totals were inconsistent | Shared daily fictional fixture; 7 calendar dates, 30 calendar dates, MTD; dated buckets and accessible table | Fictional USD values, never live reporting or forecasts |
| Fixed stale date and false freshness | Kabul date updates each minute; no fake last-updated timestamp | Current date is not a data freshness claim |
| Next moves CTA | React section ref, scrolling, focus and reduced-motion support | Checklist stays in session memory |
| Help coming soon | Help dialog explains available actions and limitations | No invented support address |
| Keyboard and legibility issues | Dialog focus management, inline form validation, navigation state, skip link, readable metadata, hidden mobile navigation removed from tab order | Not a WCAG compliance certification |
| Browser coverage skipped on PRs | Run the existing e2e CI job on pull requests too | Deployment workflow unchanged; no deployment from this branch or PR |

## Validation

Run `pnpm check`, `pnpm test`, `pnpm build:static`, `pnpm verify:static`, and `pnpm test:e2e`.

Local static build, typecheck, artifact verification and 9 unit/server tests passed. The auth tests use synthetic sessions, not a live login. Local browser tests are blocked: Chromium is absent, and its CDN download returned an invalid archive. Browser assertions must pass in CI before this candidate can be described as verified. Existing visual baselines predate the intentional banner/copy changes; inspect generated candidates before updating them.

The new e2e cases cover navigation, sample status, title search, no-result recovery, dialog focus, empty-title validation, session reset, chart/table totals, monthly metric consistency, scroll/focus, mobile horizontal overflow and help. Test fixtures use 2026-10-28 in Kabul time. Live AI, OAuth, cloud persistence, video generation and publishing remain unverified and are outside these frontend repairs.

## Handoff status

The candidate is committed locally. A push to the separate review branch was attempted to enable CI, but automatic approval review rejected the external write under the owner's no-publication constraint. No remote branch or PR is confirmed. Do not bypass the rejection through another API. Owner approval is needed specifically to send this code to a GitHub review branch and open a draft PR; that approval would not authorize merging or deployment.

The full frontend and server bundles build, TypeScript checks pass, and static artifact verification passes. Browser checks remain blocked, so all new UI behavior and performance budgets remain unverified. This is a review candidate, not a release-ready build. Keep the old screenshot baselines until actual browser screenshots can be inspected.

The owner subsequently authorized sending only the review branch and opening a draft PR. Merge and site publication remain prohibited. CI validation may proceed on that review branch.
