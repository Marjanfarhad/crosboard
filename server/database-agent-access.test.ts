import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

const getDb = vi.fn();
vi.mock("./db", () => ({ getDb }));
import { databaseAgentRegistry, authenticateDatabaseAgent } from "./database-agent-access";

describe("agent registry database integration (mock DB; no live MySQL)", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("AGENT_JWT_SECRET", "test-only-32-byte-minimum-secret-for-agent-jwt"); vi.stubEnv("AGENT_JWT_ISSUER", "test-issuer"); vi.stubEnv("AGENT_JWT_AUDIENCE", "test-audience"); });
  it("fails closed when database is unavailable", async () => {
    getDb.mockResolvedValue(null);
    await expect(databaseAgentRegistry()).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
  it("looks up agent by database ID and returns explicit permissions", async () => {
    const rows = [{ agentId: "research", projectId: 101, enabled: true, permissions: ["research:read"] }];
    const limit = vi.fn().mockResolvedValue(rows);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    getDb.mockResolvedValue({ select: () => ({ from }) });
    const registry = await databaseAgentRegistry();
    await expect(registry.findAgent("research")).resolves.toEqual(rows[0]);
    expect(where).toHaveBeenCalledOnce();
  });
  it("rejects malformed permissions from the database", async () => {
    const limit = vi.fn().mockResolvedValue([{ agentId: "research", projectId: 101, enabled: true, permissions: "admin" }]);
    getDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit }) }) }) });
    const registry = await databaseAgentRegistry();
    await expect(registry.findAgent("research")).resolves.toBeNull();
  });
  it("fails closed if agent signing settings are missing", async () => {
    vi.stubEnv("AGENT_JWT_SECRET", "");
    await expect(authenticateDatabaseAgent({ token: "x", projectId: 101, permission: "research:read" }))
      .rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});
