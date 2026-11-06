import { describe, expect, it } from "vitest";
import { roleForIdentitySync } from "./role-policy";

describe("identity synchronization role policy", () => {
  it("grants admin only to the configured owner", () => {
    expect(roleForIdentitySync("owner-id", "owner-id")).toBe("admin");
  });
  it("does not grant admin to ordinary users", () => {
    expect(roleForIdentitySync("other-id", "owner-id")).toBe("user");
  });
  it("fails closed if owner identity is missing", () => {
    expect(roleForIdentitySync("any-id", undefined)).toBe("user");
    expect(roleForIdentitySync("", "")).toBe("user");
  });
  it("requires exact case-sensitive identity matching", () => {
    expect(roleForIdentitySync("OWNER-ID", "owner-id")).toBe("user");
  });
});
