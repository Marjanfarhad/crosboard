import { describe, expect, it, vi, afterEach } from "vitest";
import { sdk } from "./_core/sdk";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: { cookie: `${COOKIE_NAME}=synthetic-test-token` },
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

afterEach(() => vi.restoreAllMocks());
describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    vi.spyOn(sdk, "verifySession").mockResolvedValue({ openId: "sample-user", appId: "test", name: "Sample User" });
    const revoke = vi.spyOn(sdk, "revokeSessionTokensAtomically").mockResolvedValue(undefined);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(revoke).toHaveBeenCalledWith(["synthetic-test-token"]);
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
  it("does not clear the cookie when atomic revocation fails", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    vi.spyOn(sdk, "verifySession").mockResolvedValue({ openId: "sample-user", appId: "test", name: "Sample User" });
    vi.spyOn(sdk, "revokeSessionTokensAtomically").mockRejectedValue(new Error("transaction rollback"));
    await expect(appRouter.createCaller(ctx).auth.logout()).rejects.toThrow("Logout could not invalidate the session");
    expect(clearedCookies).toHaveLength(0);
  });
});
