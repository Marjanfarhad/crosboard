import { describe, expect, it } from "vitest";
import { adminProcedure, protectedProcedure, router } from "./trpc";
import type { TrpcContext } from "./context";

// These tests exercise the actual tRPC middleware, without a database or network.
const testRouter = router({
  protectedRead: protectedProcedure.query(({ ctx }) => ctx.user.id),
  adminWrite: adminProcedure.mutation(() => "allowed"),
});

function context(user: TrpcContext["user"]): TrpcContext {
  return { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function actor(role: "user" | "admin", id = 10): NonNullable<TrpcContext["user"]> {
  return { id, openId: "test-user", role } as NonNullable<TrpcContext["user"]>;
}

describe("API authorization middleware", () => {
  it("rejects unauthenticated protected reads", async () => {
    await expect(testRouter.createCaller(context(null)).protectedRead()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("allows authenticated protected reads", async () => {
    await expect(testRouter.createCaller(context(actor("user"))).protectedRead()).resolves.toBe(10);
  });
  it("rejects unauthenticated admin writes", async () => {
    await expect(testRouter.createCaller(context(null)).adminWrite()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects ordinary users from admin writes", async () => {
    await expect(testRouter.createCaller(context(actor("user"))).adminWrite()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("allows explicitly authorized admins", async () => {
    await expect(testRouter.createCaller(context(actor("admin"))).adminWrite()).resolves.toBe("allowed");
  });
});
