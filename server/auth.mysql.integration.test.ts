/**
 * Real MySQL/application-path check, opt-in only.
 * Run against a NEW disposable local database named crosboard_session_ci:
 * CROSBOARD_SESSION_MYSQL_TEST=1 DATABASE_URL=... pnpm exec vitest run server/auth.mysql.integration.test.ts
 * No OAuth provider call is mocked or claimed here: existing synthetic users
 * exercise sdk issuance/authentication and the actual tRPC logout resolver.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { decodeJwt } from "jose";
import express from "express";
import { createServer } from "node:http";
import { once } from "node:events";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "./_core/context";
import { protectedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";

const enabled = process.env.CROSBOARD_SESSION_MYSQL_TEST === "1";

describe.skipIf(!enabled)("session revocation with actual MySQL (no DB mocks)", () => {
  let client: Connection | undefined;
  let renamed = false;
  function request(token: string) {
    return { headers: { cookie: COOKIE_NAME + "=" + token }, path: "/api/trpc/auth.me" };
  }
  function logout(token: string) {
    const cleared: string[] = [];
    const api = appRouter.createCaller({
      req: request(token),
      res: { clearCookie: (name: string) => { cleared.push(name); } },
      user: null,
    } as never);
    return { api, cleared };
  }
  function fingerprint(token: string) {
    const jti = decodeJwt(token).jti;
    if (typeof jti !== "string") throw new Error("Missing issued jti");
    return createHash("sha256").update(jti).digest("hex");
  }

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (url.protocol !== "mysql:" ||
        !["127.0.0.1", "localhost"].includes(url.hostname) ||
        url.pathname !== "/crosboard_session_ci") {
      throw new Error("Only a disposable loopback crosboard_session_ci database is allowed");
    }
    vi.stubEnv("MANUS_PROJECT_ID", "session-mysql-integration");
    vi.stubEnv("MANUS_JWT_SECRET", "synthetic-session-mysql-key-never-use-in-production");
    vi.stubEnv("OWNER_OPEN_ID", "");
    client = await mysql.createConnection(url.toString());
    const [tables] = await client.query<RowDataPacket[]>("SHOW TABLES");
    if (tables.length !== 0) throw new Error("Refusing to test against a non-empty database");
    const ddl = await readFile(new URL("../docs/sql/auth-sessions-staging.sql", import.meta.url), "utf8");
    await client.query(ddl);
    await client.query(`CREATE TABLE users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      openId VARCHAR(64) NOT NULL UNIQUE, name TEXT,
      email VARCHAR(320), loginMethod VARCHAR(64),
      role ENUM('user','admin') NOT NULL DEFAULT 'user',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.upsertUser({ openId: "synthetic-user-a", name: "Integration A" });
    await db.upsertUser({ openId: "synthetic-user-b", name: "Integration B" });
  }, 30_000);

  afterAll(async () => {
    if (renamed && client) await client.query("RENAME TABLE auth_sessions_unavailable TO auth_sessions");
    if (client) await client.end();
    vi.unstubAllEnvs();
    // The runner destroys the disposable MySQL service and its synthetic data.
  });

  it("persists, authenticates, revokes via logout, and rejects replay while preserving other sessions", async () => {
    if (!client) throw new Error("MySQL not initialized");
    const first = await sdk.createSessionToken("synthetic-user-a", { expiresInMs: 120_000 });
    const second = await sdk.createSessionToken("synthetic-user-b", { expiresInMs: 120_000 });
    const hash = fingerprint(first);
    const [stored] = await client.execute<RowDataPacket[]>(
      "SELECT idHash, openId, revokedAt FROM auth_sessions WHERE idHash=?", [hash]);
    expect(stored).toHaveLength(1);
    expect(stored[0].openId).toBe("synthetic-user-a");
    expect(stored[0].revokedAt).toBeNull();
    expect(hash).not.toBe(decodeJwt(first).jti);
    await expect(sdk.authenticateRequest(request(first) as never)).resolves.toMatchObject({ openId: "synthetic-user-a" });

    const result = logout(first);
    await expect(result.api.auth.logout()).resolves.toEqual({ success: true });
    expect(result.cleared).toContain(COOKIE_NAME);
    const [revoked] = await client.execute<RowDataPacket[]>(
      "SELECT revokedAt FROM auth_sessions WHERE idHash=?", [hash]);
    expect(revoked[0].revokedAt).not.toBeNull();
    await expect(sdk.authenticateRequest(request(first) as never)).rejects.toThrow();
    await expect(sdk.authenticateRequest(request(second) as never)).resolves.toMatchObject({ openId: "synthetic-user-b" });

    const expired = await sdk.createSessionToken("synthetic-user-a", { expiresInMs: 120_000 });
    await client.execute("UPDATE auth_sessions SET expiresAt=DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE idHash=?", [fingerprint(expired)]);
    expect(await sdk.verifySession(expired)).toBeNull();

    const wrongOwner = await sdk.createSessionToken("synthetic-user-a", { expiresInMs: 120_000 });
    await client.execute("UPDATE auth_sessions SET openId=? WHERE idHash=?", ["synthetic-user-b", fingerprint(wrongOwner)]);
    expect(await sdk.verifySession(wrongOwner)).toBeNull();

    const unknown = await sdk.createSessionToken("synthetic-user-a", { expiresInMs: 120_000 });
    await client.execute("DELETE FROM auth_sessions WHERE idHash=?", [fingerprint(unknown)]);
    expect(await sdk.verifySession(unknown)).toBeNull();

    // Actual storage query failure, not a mocked return value.
    await client.query("RENAME TABLE auth_sessions TO auth_sessions_unavailable");
    renamed = true;
    try {
      expect(await sdk.verifySession(second)).toBeNull();
      await expect(sdk.createSessionToken("synthetic-user-a")).rejects.toThrow();
      const failedLogout = logout(second);
      await expect(failedLogout.api.auth.logout()).rejects.toThrow();
      expect(failedLogout.cleared).toContain(COOKIE_NAME);
    } finally {
      await client.query("RENAME TABLE auth_sessions_unavailable TO auth_sessions");
      renamed = false;
    }
    // Failed revocation must not be mistaken for invalidating a copied token.
    expect(await sdk.verifySession(second)).toMatchObject({ openId: "synthetic-user-b" });
    await logout(second).api.auth.logout();
    expect(await sdk.verifySession(second)).toBeNull();
  }, 30_000);
  it("enforces cookie sessions, logout and fail-closed recovery over real HTTP", async () => {
    if (!client) throw new Error("MySQL not initialized");
    const app = express();
    app.use(express.json());
    app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
    // Test-only procedure: exercise the application's real protection middleware.
    const probe = router({
      identity: protectedProcedure.query(({ ctx }) => ({ openId: ctx.user.openId })),
    });
    app.use("/api/probe", createExpressMiddleware({ router: probe, createContext }));
    const server = createServer(app);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing HTTP listener");
    const base = "http://127.0.0.1:" + address.port;
    async function call(path: string, token?: string, method = "GET") {
      return fetch(base + path, {
        method,
        headers: token ? { cookie: COOKIE_NAME + "=" + token } : {},
      });
    }
    async function identity(token?: string) {
      const response = await call("/api/probe/identity", token);
      const body = await response.json();
      return { response, body };
    }
    try {
      const first = await sdk.createSessionToken("synthetic-user-a", { expiresInMs: 120_000 });
      const second = await sdk.createSessionToken("synthetic-user-b", { expiresInMs: 120_000 });
      expect((await identity()).response.status).toBe(401);
      expect((await identity("invalid-token")).response.status).toBe(401);
      const active = await identity(first);
      expect(active.response.status).toBe(200);
      expect(active.body.result.data.json).toEqual({ openId: "synthetic-user-a" });
      const me = await call("/api/trpc/auth.me", first);
      expect(me.status).toBe(200);
      expect((await me.json()).result.data.json.openId).toBe("synthetic-user-a");

      const loggedOut = await call("/api/trpc/auth.logout", first, "POST");
      expect(loggedOut.status).toBe(200);
      expect((await loggedOut.json()).result.data.json).toEqual({ success: true });
      const clearedCookie = loggedOut.headers.get("set-cookie") ?? "";
      expect(clearedCookie).toContain(COOKIE_NAME + "=");
      expect(clearedCookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
      expect((await identity(first)).response.status).toBe(401);
      expect((await identity(second)).body.result.data.json.openId).toBe("synthetic-user-b");

      const expired = await sdk.createSessionToken("synthetic-user-a", { expiresInMs: 120_000 });
      await client.execute("UPDATE auth_sessions SET expiresAt=DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE idHash=?", [fingerprint(expired)]);
      expect((await identity(expired)).response.status).toBe(401);

      await client.query("RENAME TABLE auth_sessions TO auth_sessions_unavailable");
      renamed = true;
      try {
        expect((await identity(second)).response.status).toBe(401);
        const failure = await call("/api/trpc/auth.logout", second, "POST");
        expect(failure.status).toBe(500);
        expect(await failure.json()).toHaveProperty("error");
        expect(failure.headers.get("set-cookie")).toContain(COOKIE_NAME + "=");
      } finally {
        await client.query("RENAME TABLE auth_sessions_unavailable TO auth_sessions");
        renamed = false;
      }
      // An unsuccessful logout has not invalidated the copied token.
      expect((await identity(second)).response.status).toBe(200);
      const recovery = await call("/api/trpc/auth.logout", second, "POST");
      expect(recovery.status).toBe(200);
      expect((await identity(second)).response.status).toBe(401);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }, 30_000);

});
