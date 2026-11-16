import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { requireProjectOwner, type VerifiedPrincipal } from "./development-access";

/**
 * Development-only authorization harness. Uses explicit test fixtures, not
 * database records. Never enable this router in production or appRouter.
 * Future real endpoints MUST load ownership from DB by project ID, not from
 * user-provided owner IDs.
 */
const fixtureProjects = new Map<number, { ownerId: number }>([
  [101, { ownerId: 11 }],
  [202, { ownerId: 22 }],
]);
const fixtureAgents = new Map<string, { projectId: number; enabled: boolean; permissions: readonly string[] }>([
  ["research-101", { projectId: 101, enabled: true, permissions: ["research:read"] }],
  ["disabled-101", { projectId: 101, enabled: false, permissions: ["research:read"] }],
  ["content-202", { projectId: 202, enabled: true, permissions: ["content:write"] }],
]);

function requireOwner(actor: VerifiedPrincipal, projectId: number) {
  const project = fixtureProjects.get(projectId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });
  try {
    requireProjectOwner(actor, project.ownerId);
  } catch {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}
export const developmentAuthorizationRouter = router({
  projectRead: protectedProcedure.input(z.object({ projectId: z.number().int().positive() }))
    .query(({ ctx, input }) => {
      requireOwner(ctx.user, input.projectId);
      return { projectId: input.projectId };
    }),
  agentPermission: protectedProcedure.input(z.object({
    projectId: z.number().int().positive(),
    agentId: z.string().min(1),
    permission: z.enum(["research:read", "content:write"]),
  })).query(({ ctx, input }) => {
    requireOwner(ctx.user, input.projectId);
    const agent = fixtureAgents.get(input.agentId);
    if (!agent || !agent.enabled || agent.projectId !== input.projectId ||
        !agent.permissions.includes(input.permission)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return { allowed: true as const };
  }),
});
