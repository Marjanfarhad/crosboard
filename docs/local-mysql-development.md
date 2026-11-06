# Local MySQL development foundation

This is an isolated, zero-cost **development-only** setup. Do not point it at a production database.

## Prerequisites
- MySQL 8 installed locally (Community Server)
- Node.js and pnpm as required by the repository

## Create an isolated database
Log in to local MySQL as an administrator, then run:

```sql
CREATE DATABASE IF NOT EXISTS command_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'command_dev'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_UNIQUE_LONG_RANDOM_PASSWORD';
GRANT ALL PRIVILEGES ON command_dev.* TO 'command_dev'@'localhost';
```

Replace the example password before running; never commit the real password. The grant is limited to the development database; do not reuse this account for production.

## Configure locally
Create a local, git-ignored `.env` (verify ignore rules before use):

```dotenv
DATABASE_URL=mysql://command_dev:URL_ENCODED_PASSWORD@localhost:3306/command_dev
```

URL-encode reserved characters in the password. Keep the connection string out of commits, screenshots, and logs. Ensure the app's server-side environment loader actually loads the file.

## Initialize and verify
From the repository root, after reviewing the generated SQL:

```bash
pnpm install
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate
pnpm test
```

The migration commands must be run **only** with the local `command_dev` URL. Before migration, confirm `SELECT DATABASE();` returns `command_dev` for that connection. Do not run migrations against a shared or live database.

## Security and next steps
- Existing schema defines `users`; do not assume projects, campaigns, content, or agent tables exist.
- Review `server/db.ts` role assignment: `upsertUser` accepts a role field and must never trust an unverified client-supplied role.
- Verify database connectivity with a real query; constructing a Drizzle client alone is not a connection health check.
- Keep MySQL bound to localhost, use a separate database user, and never expose port 3306 publicly.
- Do not modify production settings, deploy, or purchase hosting.
- Future migrations must be additive and reviewed, with rollback/backup plans.

**Status:** setup instructions only; no local server was accessed, database created, migration run, or live connectivity verified.
