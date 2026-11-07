import { and, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, revokedSessions, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

/** Fail closed when the revocation store is unavailable. */
export async function isSessionRevoked(tokenHash: string): Promise<boolean> {
  const database = await getDb();
  if (!database) throw new Error("Session revocation database unavailable");
  const found = await database.select({ tokenHash: revokedSessions.tokenHash })
    .from(revokedSessions)
    .where(and(eq(revokedSessions.tokenHash, tokenHash), gt(revokedSessions.expiresAt, new Date())))
    .limit(1);
  return found.length > 0;
}

export async function revokeSession(tokenHash: string, expiresAt: Date): Promise<void> {
  const database = await getDb();
  if (!database) throw new Error("Session revocation database unavailable");
  await database.insert(revokedSessions).values({ tokenHash, expiresAt })
    .onDuplicateKeyUpdate({ set: { expiresAt } });
}

/** Persist all session revocations atomically; failure rolls back the entire batch. */
export async function revokeSessionsAtomically(sessions: { tokenHash: string; expiresAt: Date }[]): Promise<void> {
  if (!sessions.length) throw new Error("No sessions to revoke");
  const database = await getDb();
  if (!database) throw new Error("Session revocation database unavailable");
  await database.transaction(async (tx) => {
    for (const session of sessions) {
      await tx.insert(revokedSessions).values(session)
        .onDuplicateKeyUpdate({ set: { expiresAt: session.expiresAt } });
    }
  });
}
