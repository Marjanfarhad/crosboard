import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn(async () => true) }));

function ctx(role?: "user" | "admin"): TrpcContext {
  return {
    user: role ? ({ id: 10, openId: "test-user", role } as NonNullable<TrpcContext["user"]>) : null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const payload = { title: "Security test", content: "No external delivery for denied callers" };

describe("real appRouter system.notifyOwner authorization", () => {
  it("rejects unauthenticated callers", async () => {
    await expect(appRouter.createCaller(ctx()).system.notifyOwner(payload)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects ordinary users", async () => {
    await expect(appRouter.createCaller(ctx("user")).system.notifyOwner(payload)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows authenticated admins", async () => {
    await expect(appRouter.createCaller(ctx("admin")).system.notifyOwner(payload)).resolves.toEqual({ success: true });
  });
});
