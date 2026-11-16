import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { assertDatabaseProjectOwner } from "./database-project-access";
import { authenticateDatabaseAgent } from "./database-agent-access";

/**
 * DEVELOPMENT-ONLY real DB/API integration.
 * Deliberately NOT mounted in appRouter until schema migrations and
 * integration tests are reviewed. No writes or agent execution are exposed.
 */
const projectId = z.number().int().positive();
export const databaseAuthorizationRouter = router({
  projectRead: protectedProcedure
    .input(z.object({ projectId }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await assertDatabaseProjectOwner(db, ctx.user, input.projectId);
      return { projectId: input.projectId, authorized: true as const };
    }),
  agentPermission: publicProcedure
    .input(z.object({
      projectId, token: z.string().min(1),
      permission: z.enum(["research:read", "content:write"]),
    }))
    .mutation(async ({ input }) => {
      const agent = await authenticateDatabaseAgent(input);
      return { agentId: agent.agentId, projectId: agent.projectId, authorized: true as const };
    }),
});
