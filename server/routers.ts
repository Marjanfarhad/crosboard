import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const cookies = parseCookieHeader(ctx.req.headers.cookie ?? "");
      const auth = ctx.req.headers.authorization;
      const token = cookies[COOKIE_NAME] ??
        (typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : undefined);
      try {
        // If persistence fails, do not report successful server-side logout.
        await sdk.revokeSessionToken(token);
      } finally {
        ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      }
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
