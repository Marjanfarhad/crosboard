-- REVIEW ONLY. Apply to a backed-up staging database before any production rollout.
-- Do not execute automatically on the production database.
CREATE TABLE IF NOT EXISTS auth_sessions (
  idHash VARCHAR(64) NOT NULL PRIMARY KEY,
  openId VARCHAR(64) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  revokedAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX auth_sessions_openId_idx (openId),
  INDEX auth_sessions_expiresAt_idx (expiresAt)
);

-- Database keeps a SHA-256 fingerprint of the random JWT jti, not the raw token.
-- Application enforces: matching openId, expiresAt > CURRENT_TIMESTAMP,
-- and revokedAt IS NULL. Deleting expired rows requires a separate retention policy.
