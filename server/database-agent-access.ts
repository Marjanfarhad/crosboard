import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { agentRegistrations } from "../drizzle/proposed-agent-registry";
import { verifyAgentAccess, type AgentRegistry } from "./agent-identity";

/** Real database lookup; returns no permissions if DB/schema unavailable. */
export async function databaseAgentRegistry(): Promise<AgentRegistry> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Database unavailable" });
  return {
    async findAgent(agentId) {
      const rows = await db.select().from(agentRegistrations)
        .where(eq(agentRegistrations.agentId, agentId)).limit(1);
      const row = rows[0];
      if (!row || !Array.isArray(row.permissions) ||
          !row.permissions.every(p => typeof p === "string")) return null;
      return {
        agentId: row.agentId, projectId: row.projectId,
        enabled: row.enabled, permissions: row.permissions,
      };
    },
  };
}

/** Explicit agent credential, separate from browser OAuth/session cookies. */
export async function authenticateDatabaseAgent(input: {
  token: string; projectId: number; permission: string;
}): Promise<{ agentId: string; projectId: number }> {
  const secretText = process.env.AGENT_JWT_SECRET;
  const issuer = process.env.AGENT_JWT_ISSUER;
  const audience = process.env.AGENT_JWT_AUDIENCE;
  if (!secretText || !issuer || !audience) throw new TRPCError({
    code: "SERVICE_UNAVAILABLE", message: "Agent authentication not configured",
  });
  const registry = await databaseAgentRegistry();
  try {
    return await verifyAgentAccess({
      ...input, secret: new TextEncoder().encode(secretText),
      issuer, audience, registry,
    });
  } catch {
    throw new TRPCError({ code: "FORBIDDEN", message: "Agent access denied" });
  }
}
