import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { projects } from "../drizzle/proposed-development-schema";
import { requireProjectOwner, type VerifiedPrincipal } from "./development-access";

/**
 * Database-backed ownership check for future project endpoints.
 * Not registered in appRouter; proposed tables are not migrated yet.
 * Never accept an ownerId from client input.
 */
export async function assertDatabaseProjectOwner(
  db: { select: (...args: any[]) => any },
  principal: VerifiedPrincipal | null | undefined,
  projectId: number,
): Promise<void> {
  if (!principal || principal.isCron || !Number.isSafeInteger(principal.id) ||
      principal.id <= 0 || !Number.isSafeInteger(projectId) || projectId <= 0) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  // Scope at SQL level, not just after fetching a record.
  const rows: Array<{ ownerId: number }> = await db.select({ ownerId: projects.ownerId })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, principal.id)))
    .limit(1);
  if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
  try { requireProjectOwner(principal, rows[0].ownerId); }
  catch { throw new TRPCError({ code: "FORBIDDEN" }); }
}
