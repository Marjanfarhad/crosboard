/**
 * Proposed authorization guard for future Command database routes.
 * Not wired into production routers. All callers must use a verified
 * server-side identity, never a client-supplied user ID or role.
 */
export type VerifiedPrincipal = {
  id: number;
  role: "user" | "admin";
  isCron?: boolean;
};

export class AccessDeniedError extends Error {
  constructor() { super("Access denied"); this.name = "AccessDeniedError"; }
}

export function requireProjectOwner(
  principal: VerifiedPrincipal | null | undefined,
  projectOwnerId: number,
): void {
  if (!principal || principal.isCron || !Number.isSafeInteger(principal.id) ||
      principal.id <= 0 || !Number.isSafeInteger(projectOwnerId) ||
      projectOwnerId <= 0 || principal.id !== projectOwnerId) {
    throw new AccessDeniedError();
  }
}

export function requireAdmin(
  principal: VerifiedPrincipal | null | undefined,
): void {
  if (!principal || principal.isCron || !Number.isSafeInteger(principal.id) ||
      principal.id <= 0 || principal.role !== "admin") {
    throw new AccessDeniedError();
  }
}
