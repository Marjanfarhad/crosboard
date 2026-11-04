# Command official site publication

The official GitHub Pages address opens the existing Access-protected Command Worker. The original React dashboard is built with VITE_COMMAND_CLOUD_SYNC=true and deployed to that Worker with the existing account-scoped D1 binding. This replaces the standalone frontend on the secure Command Worker; the older preview/recovery Worker is untouched.

The Pages deployment waits for the Cloudflare job. That job runs TypeScript, unit tests, backend regressions, desktop/mobile cloud UI tests with a mock API, live staging D1 synthetic-isolation checks and cleanup, then builds and deploys the React app. It records the previous deployments in Actions logs and verifies an unauthenticated Access login redirect. Only after success is the Pages redirect artifact published.

The Pages site's existing demo regression and Lighthouse checks run before replacing its upload entrypoint with the redirect. Those audits describe the underlying demo build, not the final redirect landing page. The redirect itself has a simple assertion of the fixed HTTPS target and fallback link.

The existing secure Worker hostname retains "staging" in its name; it is not a newly registered custom domain. The allowed identity and D1 database remain unchanged. TikTok OAuth, publishing, destructive controls, and email/push reminders remain disabled. Live AI is gated by the initial provider check and the shared 10-attempt budget described in command-live-ai.md.

A successful automated release is not proof of completed real browser sign-in and saving in the newly deployed React UI. Confirm those flows after release. Roll back the secure Worker using a prior version listed by the Cloudflare deployment step if the new frontend fails; GitHub Pages can be rolled back through its deployment history.
