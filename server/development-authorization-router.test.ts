import { describe, expect, it } from "vitest";
import { developmentAuthorizationRouter } from "./development-authorization-router";
import type { TrpcContext } from "./_core/context";

function ctx(id?: number): TrpcContext {
  return {
    user: id === undefined ? null : ({ id, openId: "test-" + id, role: "user" } as NonNullable<TrpcContext["user"]>),
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}
describe("development project ownership and agent access", () => {
  it("blocks anonymous project access", async () => {
    await expect(developmentAuthorizationRouter.createCaller(ctx()).projectRead({ projectId: 101 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("permits only the project's owner", async () => {
    await expect(developmentAuthorizationRouter.createCaller(ctx(11)).projectRead({ projectId: 101 }))
      .resolves.toEqual({ projectId: 101 });
    await expect(developmentAuthorizationRouter.createCaller(ctx(22)).projectRead({ projectId: 101 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects missing projects", async () => {
    await expect(developmentAuthorizationRouter.createCaller(ctx(11)).projectRead({ projectId: 999 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("allows only explicitly assigned agent permission", async () => {
    await expect(developmentAuthorizationRouter.createCaller(ctx(11)).agentPermission({
      projectId: 101, agentId: "research-101", permission: "research:read",
    })).resolves.toEqual({ allowed: true });
    await expect(developmentAuthorizationRouter.createCaller(ctx(11)).agentPermission({
      projectId: 101, agentId: "research-101", permission: "content:write",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("blocks disabled, unknown, cross-project and cross-owner agents", async () => {
    for (const agentId of ["disabled-101", "missing", "content-202"]) {
      await expect(developmentAuthorizationRouter.createCaller(ctx(11)).agentPermission({
        projectId: 101, agentId, permission: "research:read",
      })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    await expect(developmentAuthorizationRouter.createCaller(ctx(22)).agentPermission({
      projectId: 101, agentId: "research-101", permission: "research:read",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
