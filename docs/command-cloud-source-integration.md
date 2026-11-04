# Command React and Cloudflare source integration

This review branch starts at main. It adds the Cloudflare Access/D1 implementation and adapts the original React dashboard to it without importing the recovery branch's Docker, MySQL-session, or PR #9 changes.

## Behavior

Default builds preserve the existing sample dashboard and GitHub Pages base path. A build with VITE_COMMAND_CLOUD_SYNC=true loads the authenticated workspace before rendering records, creates products in the cloud, provides a Studio form for video metrics, and computes aggregate views, commission, and RPM from the logged records. Fictional chart and capacity panels are hidden in cloud mode. Cloud builds use the root base path required by the Worker.

Workspace saves preserve unknown document fields, notes and reminders from the standalone staging frontend, use the server's revision, and include the loaded account ID so a session switch cannot save a previous account's document. Failed saves do not claim success; editing pauses while the current form stays mounted. New sessions fetch their cloud document without uploading demo fixtures or unscoped browser storage.

AI, publishing and TikTok OAuth remain unavailable. There is no change to provider billing. The React version also provides product and video editing, creative-note creation/editing, in-app 24-hour reminders with a mark-logged action, video CSV export/import with an append confirmation, a workspace JSON download and sign-out. Destructive delete/clear actions are intentionally omitted from the review UI. Email/push reminders, live AI, publishing and TikTok OAuth are not active.

## Verification and rollout

The dedicated Actions workflow typechecks the complete repository, tests cloud document compatibility and RPM, runs the backend tests, builds the React cloud variant and uploads it for review. It has no Cloudflare credentials and performs no deployment. The live D1 synthetic-isolation checks were performed by the separate staging workflow; they do not prove this React UI's browser flows.

Before promotion, test the React artifact against the separate staging Worker at desktop/mobile widths: sign-in, product creation, video entry, reload, sign-out/in, second-browser persistence, account switch, rejected save and conflict recovery. The prior standalone Worker versions remain available for rollback; no version is deleted during publication. The official publication workflow now deploys the cloud React build to the existing secure Command Worker, then promotes the GitHub Pages entrypoint to that protected app. See command-official-publication.md for rollout and rollback details. PR #9 remains unmerged.
