import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "./schema";
import { createTestDb, resetTestDb } from "./test-db";
import type { Db } from "./types";

let db: Db;
let ids: { estate: string; unit: string; guard: string; resident: string };

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  await resetTestDb(db);
  const [estate] = await db
    .insert(schema.estate)
    .values({ name: "Mvule Gardens" })
    .returning();
  const [unit] = await db
    .insert(schema.unit)
    .values({ estateId: estate!.id, label: "B4" })
    .returning();
  const [guard, resident] = await db
    .insert(schema.person)
    .values([
      { estateId: estate!.id, name: "Juma", role: "guard" },
      { estateId: estate!.id, name: "Wanjiru", role: "resident" },
    ])
    .returning();
  ids = {
    estate: estate!.id,
    unit: unit!.id,
    guard: guard!.id,
    resident: resident!.id,
  };
});

const event = (over: Partial<typeof schema.entryEvent.$inferInsert> = {}) => ({
  id: crypto.randomUUID(),
  estateId: ids.estate,
  unitId: ids.unit,
  visitorName: "Amina Otieno",
  guardId: ids.guard,
  deviceId: "gate-phone-1",
  kind: "entry" as const,
  deviceTime: new Date("2026-11-10T08:00:00Z"),
  ...over,
});

const pass = (over: Partial<typeof schema.pass.$inferInsert> = {}) => ({
  estateId: ids.estate,
  unitId: ids.unit,
  createdBy: ids.resident,
  shortCode: "ABCDEFGH",
  visitorName: "Amina Otieno",
  validFrom: new Date("2026-11-10T08:00:00Z"),
  validUntil: new Date("2026-11-10T12:00:00Z"),
  ...over,
});

describe("entry events", () => {
  it("ignore a retried upload of the same event", async () => {
    const e = event();
    await db.insert(schema.entryEvent).values(e).onConflictDoNothing();
    await db.insert(schema.entryEvent).values(e).onConflictDoNothing();
    expect(await db.$count(schema.entryEvent)).toBe(1);
  });

  it("require a reason on a refusal", async () => {
    await expect(
      db.insert(schema.entryEvent).values(event({ kind: "refusal" })),
    ).rejects.toThrow();
    await db
      .insert(schema.entryEvent)
      .values(event({ kind: "refusal", reason: "expired" }));
    expect(await db.$count(schema.entryEvent)).toBe(1);
  });

  it("refuse a reason on an entry", async () => {
    await expect(
      db.insert(schema.entryEvent).values(event({ reason: "expired" })),
    ).rejects.toThrow();
  });
});

describe("passes", () => {
  it("refuse a window that ends before it starts", async () => {
    await expect(
      db
        .insert(schema.pass)
        .values(pass({ validUntil: new Date("2026-11-10T07:00:00Z") })),
    ).rejects.toThrow();
  });

  it("refuse a use limit outside 1 to 10", async () => {
    await expect(
      db.insert(schema.pass).values(pass({ maxUses: 0 })),
    ).rejects.toThrow();
    await expect(
      db.insert(schema.pass).values(pass({ maxUses: 11 })),
    ).rejects.toThrow();
  });

  it("keep short codes unique within an estate", async () => {
    await db.insert(schema.pass).values(pass());
    await expect(db.insert(schema.pass).values(pass())).rejects.toThrow();
  });
});

describe("people", () => {
  it("refuse an unknown role", async () => {
    await expect(
      db.insert(schema.person).values({
        estateId: ids.estate,
        name: "X",
        role: "owner" as "admin",
      }),
    ).rejects.toThrow();
  });
});
