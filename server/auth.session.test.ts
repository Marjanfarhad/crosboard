import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT, decodeJwt } from "jose";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { COOKIE_NAME } from "../shared/const";

vi.mock("./db", () => ({
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  persistAuthSession: vi.fn(),
  isAuthSessionActive: vi.fn(),
  revokeAuthSession: vi.fn(),
}));
const secret = "synthetic-session-test-key-not-for-production";
async function token(openId = "user-a", expiration?: number, jti: string | null = "test-session-id") {
  let jwt = new SignJWT({ openId, appId: "project-test", name: "" })
    .setProtectedHeader({ alg: "HS256" });
  if (jti !== null) jwt = jwt.setJti(jti);
  if (expiration !== undefined) jwt = jwt.setExpirationTime(expiration);
  return jwt.sign(new TextEncoder().encode(secret));
}
function configure() {
  vi.stubEnv("MANUS_PROJECT_ID", "project-test");
  vi.stubEnv("MANUS_JWT_SECRET", secret);
  vi.mocked(db.isAuthSessionActive).mockResolvedValue(true);
}
afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); vi.unstubAllEnvs(); });
describe("session validation and revocation boundaries", () => {
  it("rejects signed tokens without expiration", async () => {
    configure();
    expect(await sdk.verifySession(await token())).toBeNull();
  });
  it("rejects expired sessions and accepts a registered active session", async () => {
    configure();
    expect(await sdk.verifySession(await token("user-a", Math.floor(Date.now() / 1000) - 10))).toBeNull();
    expect(await sdk.verifySession(await token("user-a", Math.floor(Date.now() / 1000) + 60))).toMatchObject({ openId: "user-a" });
    expect(db.isAuthSessionActive).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/), "user-a");
  });
  it("rejects legacy interactive sessions without jti even when signed", async () => {
    configure();
    expect(await sdk.verifySession(await token("user-a", Math.floor(Date.now() / 1000) + 60, null))).toBeNull();
    expect(db.isAuthSessionActive).not.toHaveBeenCalled();
  });
  it("rejects unknown or revoked session records", async () => {
    configure();
    vi.mocked(db.isAuthSessionActive).mockResolvedValue(false);
    expect(await sdk.verifySession(await token("user-a", Math.floor(Date.now() / 1000) + 60))).toBeNull();
  });
  it("fails closed when session database is unavailable", async () => {
    configure();
    vi.mocked(db.isAuthSessionActive).mockRejectedValue(new Error("Database unavailable"));
    expect(await sdk.verifySession(await token("user-a", Math.floor(Date.now() / 1000) + 60))).toBeNull();
  });
  it("persists a hashed session ID before returning a newly issued JWT", async () => {
    configure();
    const issued = await sdk.createSessionToken("user-a", { expiresInMs: 120_000 });
    const claims = decodeJwt(issued);
    expect(claims.jti).toEqual(expect.any(String));
    expect(db.persistAuthSession).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/), "user-a", expect.any(Date)
    );
    expect(db.persistAuthSession).not.toHaveBeenCalledWith(claims.jti, expect.anything(), expect.anything());
  });
  it("does not issue a session if persistence fails", async () => {
    configure();
    vi.mocked(db.persistAuthSession).mockRejectedValue(new Error("Database unavailable"));
    await expect(sdk.createSessionToken("user-a", { expiresInMs: 120_000 })).rejects.toThrow("Database unavailable");
  });
  it("revokes the exact signed session and denies subsequent requests", async () => {
    configure();
    const issued = await sdk.createSessionToken("user-a", { expiresInMs: 120_000 });
    await sdk.revokeSessionToken(issued);
    expect(db.revokeAuthSession).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/), "user-a");
    vi.mocked(db.isAuthSessionActive).mockResolvedValue(false);
    expect(await sdk.verifySession(issued)).toBeNull();
  });
  it("rejects invalid or missing-jti tokens for revocation", async () => {
    configure();
    await expect(sdk.revokeSessionToken("not-a-jwt")).rejects.toThrow();
    await expect(sdk.revokeSessionToken(await token("user-a", Math.floor(Date.now() / 1000) + 60, null))).rejects.toThrow();
    expect(db.revokeAuthSession).not.toHaveBeenCalled();
  });
  it("does not sync a different upstream identity", async () => {
    configure();
    vi.mocked(db.getUserByOpenId).mockResolvedValue(undefined);
    vi.spyOn(sdk, "getUserInfoWithJwt").mockResolvedValue({ openId: "user-b", name: "Other" } as never);
    const session = await token("user-a", Math.floor(Date.now() / 1000) + 60);
    await expect(sdk.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${session}` }, path: "/api/trpc/auth.me" } as never)).rejects.toThrow();
    expect(db.upsertUser).not.toHaveBeenCalled();
  });
  it("rejects scheduled identity mismatch before building a cron user", async () => {
    configure();
    vi.spyOn(sdk, "getUserInfoWithJwt").mockResolvedValue({ openId: "cron_other", taskUid: "task-test" } as never);
    const session = await token("cron_expected", Math.floor(Date.now() / 1000) + 60, null);
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
  it("accepts matching scheduled identity with a task ID without DB-session lookup", async () => {
    configure();
    vi.spyOn(sdk, "getUserInfoWithJwt").mockResolvedValue({ openId: "cron_expected", taskUid: "task-test" } as never);
    const session = await token("cron_expected", Math.floor(Date.now() / 1000) + 60, null);
    await expect(sdk.authenticateRequest({ headers: { cookie: `${COOKIE_NAME}=${session}` }, path: "/api/scheduled/test" } as never)).resolves.toMatchObject({ openId: "cron_expected", taskUid: "task-test", isCron: true });
    expect(db.isAuthSessionActive).not.toHaveBeenCalled();
  });
});
