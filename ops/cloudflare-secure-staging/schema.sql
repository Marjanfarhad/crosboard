CREATE TABLE IF NOT EXISTS workspaces (
  owner_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  document TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
