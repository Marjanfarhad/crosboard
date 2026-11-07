CREATE TABLE IF NOT EXISTS `revoked_sessions` (
  `tokenHash` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `revokedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `revoked_sessions_tokenHash` PRIMARY KEY (`tokenHash`)
);
