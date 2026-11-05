CREATE TABLE IF NOT EXISTS workspaces (
  owner_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  document TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);



CREATE TABLE IF NOT EXISTS ai_limits (
  budget_key TEXT PRIMARY KEY,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0)
);
INSERT INTO ai_limits(budget_key, used) VALUES ('initial-live-test', 0)
ON CONFLICT(budget_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_checks (
  model TEXT PRIMARY KEY,
  verified_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tiktok_oauth_states (
  owner_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
