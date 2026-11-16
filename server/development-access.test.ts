import { describe, expect, it } from "vitest";
import { requireAdmin, requireProjectOwner } from "./development-access";

describe("proposed Command database authorization guards", () => {
  const owner = { id: 12, role: "user" as const };
  it("allows the verified owner only", () => {
    expect(() => requireProjectOwner(owner, 12)).not.toThrow();
    expect(() => requireProjectOwner(owner, 13)).toThrow("Access denied");
  });
  it("fails closed for anonymous, invalid and cron principals", () => {
    expect(() => requireProjectOwner(null, 12)).toThrow();
    expect(() => requireProjectOwner({ id: -1, role: "user", isCron: true }, 12)).toThrow();
    expect(() => requireProjectOwner(owner, 0)).toThrow();
    expect(() => requireProjectOwner({ id: NaN, role: "user" }, 12)).toThrow();
  });
  it("does not let an admin bypass project ownership", () => {
    expect(() => requireProjectOwner({ id: 1, role: "admin" }, 12)).toThrow();
  });
  it("requires a verified non-cron admin for administrative operations", () => {
    expect(() => requireAdmin({ id: 1, role: "admin" })).not.toThrow();
    expect(() => requireAdmin(owner)).toThrow();
    expect(() => requireAdmin({ id: 1, role: "admin", isCron: true })).toThrow();
    expect(() => requireAdmin(null)).toThrow();
  });
});
