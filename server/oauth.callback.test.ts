import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import { COOKIE_NAME, OAUTH_STATE_COOKIE, ONE_WEEK_MS, encodeOAuthState } from "../shared/const";
import { registerOAuthRoutes } from "./_core/oauth";
import { sdk } from "./_core/sdk";
import * as db from "./db";

vi.mock("./_core/sdk", () => ({
  sdk: {
    exchangeCodeForToken: vi.fn(),
    getUserInfo: vi.fn(),
    createSessionToken: vi.fn(),
  },
}));
vi.mock("./db", () => ({ upsertUser: vi.fn() }));

let server: Server;
let baseUrl: string;

beforeEach(async () => {
  const app = express();
  registerOAuthRoutes(app);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  );
  vi.clearAllMocks();
});

function callback(nonce = "synthetic-csrf-nonce", cookieNonce = nonce) {
  const state = encodeOAuthState({
    nonce,
    redirectUri: "https://example.invalid/api/oauth/callback",
  });
  return fetch(`${baseUrl}/api/oauth/callback?code=synthetic-code&state=${encodeURIComponent(state)}`, {
    redirect: "manual",
    headers: cookieNonce ? { cookie: `${OAUTH_STATE_COOKIE}=${cookieNonce}` } : {},
  });
}

describe("OAuth callback security boundaries (mock provider and DB)", () => {
  it("rejects callbacks with absent parameters before contacting the provider", async () => {
    const response = await fetch(`${baseUrl}/api/oauth/callback`);
    expect(response.status).toBe(400);
    expect(sdk.exchangeCodeForToken).not.toHaveBeenCalled();
  });

  it("rejects a mismatched state nonce before token exchange", async () => {
    const response = await callback("nonce-a", "nonce-b");
    expect(response.status).toBe(403);
    expect(sdk.exchangeCodeForToken).not.toHaveBeenCalled();
    expect(db.upsertUser).not.toHaveBeenCalled();
  });

  it("rejects a matching state without a browser nonce cookie", async () => {
    const response = await callback("nonce-a", "");
    expect(response.status).toBe(403);
    expect(sdk.exchangeCodeForToken).not.toHaveBeenCalled();
  });

  it("sets an HttpOnly Secure session cookie only after a matching identity is stored", async () => {
    vi.mocked(sdk.exchangeCodeForToken).mockResolvedValue({ accessToken: "synthetic-access" } as never);
    vi.mocked(sdk.getUserInfo).mockResolvedValue({
      openId: "synthetic-user",
      name: "Synthetic User",
      email: null,
      loginMethod: "email",
    } as never);
    vi.mocked(sdk.createSessionToken).mockResolvedValue("synthetic-session-token");

    const response = await callback();
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/");
    expect(db.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "synthetic-user" }));
    expect(sdk.createSessionToken).toHaveBeenCalledWith("synthetic-user", expect.objectContaining({ expiresInMs: ONE_WEEK_MS }));

    const cookies = response.headers.get("set-cookie") ?? "";
    expect(cookies).toContain(`${COOKIE_NAME}=synthetic-session-token`);
    expect(cookies.toLowerCase()).toContain("httponly");
    expect(cookies.toLowerCase()).toContain("secure");
    expect(cookies.toLowerCase()).toContain("samesite=none");
    expect(cookies).toContain("Max-Age=" + Math.floor(ONE_WEEK_MS / 1000));
  });

  it("does not grant a session when user info has no openId", async () => {
    vi.mocked(sdk.exchangeCodeForToken).mockResolvedValue({ accessToken: "synthetic-access" } as never);
    vi.mocked(sdk.getUserInfo).mockResolvedValue({ name: "No ID" } as never);
    const response = await callback();
    expect(response.status).toBe(400);
    expect(db.upsertUser).not.toHaveBeenCalled();
    expect(sdk.createSessionToken).not.toHaveBeenCalled();
  });

  it("does not grant a session if persistence fails", async () => {
    vi.mocked(sdk.exchangeCodeForToken).mockResolvedValue({ accessToken: "synthetic-access" } as never);
    vi.mocked(sdk.getUserInfo).mockResolvedValue({ openId: "synthetic-user" } as never);
    vi.mocked(db.upsertUser).mockRejectedValue(new Error("Synthetic database failure"));
    const response = await callback();
    expect(response.status).toBe(500);
    expect(sdk.createSessionToken).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie") ?? "").not.toContain(`${COOKIE_NAME}=`);
  });
});
