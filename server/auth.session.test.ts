import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { COOKIE_NAME } from "../shared/const";

vi.mock("./db", () => ({ getUserByOpenId: vi.fn(), upsertUser: vi.fn() }));
const secret = "synthetic-session-test-key-not-for-production";
async function token(openId = "user-a", expiration?: number) {
  let jwt = new SignJWT({ openId, appId: "project-test", name: "" })
    .setProtectedHeader({ alg: "HS256" });
  if (expiration !== undefined) jwt = jwt.setExpirationTime(expiration);
  return jwt.sign(new TextEncoder().encode(secret));
}
function configure() {
  vi.stubEnv("MANUS_PROJECT_ID", "project-test");
  vi.stubEnv("MANUS_JWT_SECRET", secret);
}
afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); vi.unstubAllEnvs(); });
describe("session validation boundaries", () => {
  it("rejects a signed token without expiration", async () => {
    configure();
    expect(await sdk.verifySession(await token())).toBeNull();
  });
  it("rejects expired tokens and accepts current project sessions", async () => {
    configure();
    expect(await sdk.verifySession(await token("user-a", Math.floor(Date.now() / 1000) - 10))).toBeNull();
    expect(await sdk.verifySession(await token("user-a", Math.floor(Date.now() / 1000) + 60))).toMatchObject({ openId: "user-a" });
  });
  it("does not sync a different upstream identity into a verified user's session", async () => {
    configure();
    vi.mocked(db.getUserByOpenId).mockResolvedValue(undefined);
    vi.spyOn(sdk, "getUserInfoWithJwt").mockResolvedValue({ openId: "user-b", name: "Other" } as never);
    const session = await token("user-a", Math.floor(Date.now() / 1000) + 60);
    await expect(sdk.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${session}` }, path: "/api/trpc/auth.me" } as never)).rejects.toThrow();
    expect(db.upsertUser).not.toHaveBeenCalled();
  });
  it("rejects a scheduled identity mismatch before building a cron user", async () => {
    configure();
    vi.spyOn(sdk, "getUserInfoWithJwt").mockResolvedValue({ openId: "cron_other", taskUid: "task-test" } as never);
    const session = await token("cron_expected", Math.floor(Date.now() / 1000) + 60);
    await expect(sdk.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${session}` }, path: "/api/scheduled/test" } as never)).rejects.toThrow();
    expect(db.upsertUser).not.toHaveBeenCalled();
  });
  it("syncs and authenticates a matching upstream identity", async () => {
    configure();
    const user = { id: 1, openId: "user-a", name: "Test" } as never;
    vi.mocked(db.getUserByOpenId).mockResolvedValueOnce(undefined).mockResolvedValueOnce(user);
    vi.spyOn(sdk, "getUserInfoWithJwt").mockResolvedValue({ openId: "user-a", name: "Test" } as never);
    const session = await token("user-a", Math.floor(Date.now() / 1000) + 60);
    await expect(sdk.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${session}` }, path: "/api/trpc/auth.me" } as never)).resolves.toBe(user);
    expect(db.upsertUser).toHaveBeenCalledTimes(2);
  });
  it("accepts a matching scheduled identity with its task ID", async () => {
    configure();
    vi.spyOn(sdk, "getUserInfoWithJwt").mockResolvedValue({ openId: "cron_expected", taskUid: "task-test" } as never);
    const session = await token("cron_expected", Math.floor(Date.now() / 1000) + 60);
    await expect(sdk.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${session}` }, path: "/api/scheduled/test" } as never)).resolves.toMatchObject({ openId: "cron_expected", taskUid: "task-test", isCron: true });
    expect(db.upsertUser).not.toHaveBeenCalled();
  });

});
