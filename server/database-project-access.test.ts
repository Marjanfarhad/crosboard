import { describe, expect, it, vi } from "vitest";
import { assertDatabaseProjectOwner } from "./database-project-access";

function fakeDb(rows: Array<{ ownerId: number }>) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  return { db: { select }, where };
}
describe("SQL-scoped project ownership (mock database)", () => {
  it("allows only a matching verified owner", async () => {
    const { db, where } = fakeDb([{ ownerId: 11 }]);
    await expect(assertDatabaseProjectOwner(db, { id: 11, role: "user" }, 101)).resolves.toBeUndefined();
    expect(where).toHaveBeenCalledOnce();
  });
  it("rejects project not found or not owned", async () => {
    const { db } = fakeDb([]);
    await expect(assertDatabaseProjectOwner(db, { id: 22, role: "user" }, 101))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects cron and invalid principals before SQL access", async () => {
    const { db } = fakeDb([{ ownerId: 11 }]);
    await expect(assertDatabaseProjectOwner(db, { id: 11, role: "admin", isCron: true }, 101))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(assertDatabaseProjectOwner(db, { id: -1, role: "user" }, 101))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.select).not.toHaveBeenCalled();
  });
  it("rejects inconsistent database owner results", async () => {
    const { db } = fakeDb([{ ownerId: 22 }]);
    await expect(assertDatabaseProjectOwner(db, { id: 11, role: "user" }, 101))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
