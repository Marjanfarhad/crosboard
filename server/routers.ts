import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const tokens = sdk.sessionTokensFromRequest(ctx.req);
      if (!tokens.length || !ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        // Persist revocation BEFORE clearing the browser cookie.
        // Revoke both cookie and preview Bearer sessions when supplied.
        // Never revoke a different user\'s token merely because it was attached.
        for (const token of tokens) {
          const session = await sdk.verifySession(token);
          if (!session || session.openId !== ctx.user.openId) {
            throw new Error("Session mismatch or already invalid");
          }
        }
        await sdk.revokeSessionTokensAtomically(tokens);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Logout could not invalidate the session" });
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return { success: true } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
