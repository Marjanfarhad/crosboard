import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";

afterEach(() => vi.restoreAllMocks());

function caller(cookie?: string, bearer?: string) {
  const clearCookie = vi.fn();
  const ctx = {
    req: {
      headers: {
        cookie: cookie ? `${COOKIE_NAME}=${cookie}` : "",
        authorization: bearer ? `Bearer ${bearer}` : undefined,
      },
    },
    res: { clearCookie },
    user: null,
  };
  return { api: appRouter.createCaller(ctx as never), clearCookie };
}

describe("logout revocation boundary", () => {
  it("revokes the cookie token before reporting successful logout", async () => {
    const revoke = vi.spyOn(sdk, "revokeSessionToken").mockResolvedValue();
    const { api, clearCookie } = caller("synthetic-token");
    await expect(api.auth.logout()).resolves.toEqual({ success: true });
    expect(revoke).toHaveBeenCalledWith("synthetic-token");
    expect(clearCookie).toHaveBeenCalledWith(COOKIE_NAME, expect.objectContaining({ httpOnly: true, secure: true }));
  });
  it("revokes a bearer session when there is no cookie", async () => {
    const revoke = vi.spyOn(sdk, "revokeSessionToken").mockResolvedValue();
    const { api } = caller(undefined, "synthetic-bearer");
    await expect(api.auth.logout()).resolves.toEqual({ success: true });
    expect(revoke).toHaveBeenCalledWith("synthetic-bearer");
  });
  it("does not claim server-side logout success when revocation storage fails", async () => {
    vi.spyOn(sdk, "revokeSessionToken").mockRejectedValue(new Error("Synthetic database unavailable"));
    const { api, clearCookie } = caller("synthetic-token");
    await expect(api.auth.logout()).rejects.toThrow("Synthetic database unavailable");
    expect(clearCookie).toHaveBeenCalledWith(COOKIE_NAME, expect.any(Object));
  });
  it("can clear an absent cookie without claiming to revoke a token", async () => {
    const revoke = vi.spyOn(sdk, "revokeSessionToken").mockResolvedValue();
    const { api, clearCookie } = caller();
    await expect(api.auth.logout()).resolves.toEqual({ success: true });
    expect(revoke).toHaveBeenCalledWith(undefined);
    expect(clearCookie).toHaveBeenCalled();
  });
});
