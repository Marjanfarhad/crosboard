import { jwtVerify } from "jose";

/**
 * Proposed independent agent authentication. Never use browser user cookies
 * as agent credentials. Token signing/issuance is intentionally NOT provided.
 * A trusted server must provision credentials and registry entries separately.
 */
export type AgentRegistration = {
  agentId: string;
  projectId: number;
  enabled: boolean;
  permissions: readonly string[];
};
export type AgentRegistry = {
  findAgent: (agentId: string) => Promise<AgentRegistration | null>;
};

export class AgentAccessDenied extends Error {
  constructor() { super("Agent access denied"); this.name = "AgentAccessDenied"; }
}

export async function verifyAgentAccess(input: {
  token: string;
  secret: Uint8Array;
  issuer: string;
  audience: string;
  projectId: number;
  permission: string;
  registry: AgentRegistry;
}): Promise<{ agentId: string; projectId: number }> {
  const { token, secret, issuer, audience, projectId, permission, registry } = input;
  if (!token || secret.byteLength < 32 || !issuer || !audience ||
      !Number.isSafeInteger(projectId) || projectId <= 0 || !permission) {
    throw new AgentAccessDenied();
  }
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer,
      audience,
      requiredClaims: ["exp", "iat", "sub", "jti"],
      clockTolerance: 0,
    });
    if (typeof payload.sub !== "string" || !payload.sub ||
        typeof payload.jti !== "string" || !payload.jti ||
        typeof payload.iat !== "number" || typeof payload.exp !== "number" ||
        payload.exp <= payload.iat || payload.exp - payload.iat > 300) {
      throw new AgentAccessDenied();
    }
    const registration = await registry.findAgent(payload.sub);
    if (!registration || !registration.enabled ||
        registration.agentId !== payload.sub ||
        registration.projectId !== projectId ||
        !registration.permissions.includes(permission)) {
      throw new AgentAccessDenied();
    }
    return { agentId: registration.agentId, projectId };
  } catch {
    throw new AgentAccessDenied();
  }
}
