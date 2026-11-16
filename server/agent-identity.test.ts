import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { verifyAgentAccess, type AgentRegistry } from "./agent-identity";

const secret = new TextEncoder().encode("test-only-32-byte-minimum-secret-for-agent-jwt");
const issuer = "command-test";
const audience = "command-agents";
const registry: AgentRegistry = {
  async findAgent(agentId) {
    if (agentId === "research") return {
      agentId, projectId: 101, enabled: true, permissions: ["research:read"],
    };
    if (agentId === "disabled") return {
      agentId, projectId: 101, enabled: false, permissions: ["research:read"],
    };
    return null;
  },
};
async function token(sub: string, options: { aud?: string; exp?: number } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" })
    .setSubject(sub).setIssuer(issuer).setAudience(options.aud ?? audience)
    .setJti("test-token-id").setIssuedAt(now)
    .setExpirationTime(options.exp ?? now + 120).sign(secret);
}
const check = (signed: string, projectId = 101, permission = "research:read") =>
  verifyAgentAccess({ token: signed, secret, issuer, audience, projectId, permission, registry });

describe("signed agent identity and project-scoped permissions", () => {
  it("accepts a signed active registered agent with exact scope", async () => {
    await expect(check(await token("research"))).resolves.toEqual({ agentId: "research", projectId: 101 });
  });
  it("rejects wrong project and permission", async () => {
    await expect(check(await token("research"), 202)).rejects.toThrow("Agent access denied");
    await expect(check(await token("research"), 101, "content:write")).rejects.toThrow("Agent access denied");
  });
  it("rejects disabled and unknown agents", async () => {
    await expect(check(await token("disabled"))).rejects.toThrow("Agent access denied");
    await expect(check(await token("unknown"))).rejects.toThrow("Agent access denied");
  });
  it("rejects wrong audience and expired token", async () => {
    await expect(check(await token("research", { aud: "another-service" }))).rejects.toThrow("Agent access denied");
    await expect(check(await token("research", { exp: Math.floor(Date.now() / 1000) - 10 }))).rejects.toThrow("Agent access denied");
  });
  it("rejects tampering and missing credentials", async () => {
    const signed = await token("research");
    await expect(check(signed.slice(0, -2) + "xx")).rejects.toThrow("Agent access denied");
    await expect(check("")).rejects.toThrow("Agent access denied");
  });
});
