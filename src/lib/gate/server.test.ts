import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEMO_ESTATE_ID, PEOPLE, seedDemoEstate } from "@/db/demo-estate";
import * as schema from "@/db/schema";
import { createTestDb, resetTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import type { Actor } from "../access/permissions";
import {
  generateSigningKey,
  importPublicKeys,
  importSigningKey,
  type ServerSigningKey,
} from "../pass/keys";
import { checkAtGate } from "./check";
import { buildGateBundle, recentGateLog, recordGateEvents } from "./server";
import type { GateEventInput } from "./types";

const NOW = new Date("2026-11-10T09:30:00Z");
let db: Db;
let key: ServerSigningKey;
let guard: Actor;

beforeAll(async () => {
  db = await createTestDb();
  key = await importSigningKey((await generateSigningKey(NOW)).privateJwk);
});

beforeEach(async () => {
  await resetTestDb(db);
  await seedDemoEstate(db, NOW);
  guard = {
    personId: PEOPLE.juma.id,
    estateId: DEMO_ESTATE_ID,
    role: "guard",
    unitIds: [],
    active: true,
  };
});

const passId = async (code: string) =>
  (
    await db
      .select({ id: schema.pass.id })
      .from(schema.pass)
      .where(eq(schema.pass.shortCode, code))
  )[0]!.id;

const event = (over: Partial<GateEventInput>): GateEventInput => ({
  id: crypto.randomUUID(),
  passId: null,
  unitId: null,
  visitorName: "Amina Otieno",
  kind: "entry",
  reason: null,
  deviceId: "test-phone",
  deviceTime: NOW.toISOString(),
  ...over,
});

describe("the gate bundle", () => {
  it("carries public keys only", async () => {
    const bundle = await buildGateBundle(db, DEMO_ESTATE_ID, key, NOW);
    expect(bundle.keys).toHaveLength(1);
    expect(JSON.stringify(bundle.keys)).not.toContain('"d"');
  });

  it("lets a device decide every demo case by short code, offline", async () => {
    const bundle = await buildGateBundle(db, DEMO_ESTATE_ID, key, NOW);
    const keys = await importPublicKeys(bundle.keys);
    const local = { usedSince: {} };
    const decide = async (code: string) => {
      const check = await checkAtGate(code, bundle, keys, local, NOW);
      if (check.kind !== "checked") return check.kind;
      return check.result.ok ? "admit" : check.result.reason;
    };
    expect(await decide("gate-2345")).toBe("admit");
    expect(await decide("MVULE234")).toBe("admit");
    expect(await decide("SALAMA22")).toBe("not_yet_valid");
    expect(await decide("PASS2345")).toBe("cancelled");
    expect(await decide("NYUMBA23")).toBe("expired");
    expect(await decide("BARAZA27")).toBe("used_up");
    expect(await decide("ZZZZ2222")).toBe("unknown_code");
    expect(await decide("hello")).toBe("not_a_code");
    expect(await decide("  ")).toBe("empty");
  });

  it("counts entries made on the device since the bundle was built", async () => {
    const bundle = await buildGateBundle(db, DEMO_ESTATE_ID, key, NOW);
    const keys = await importPublicKeys(bundle.keys);
    const id = await passId("GATE2345");
    const check = await checkAtGate(
      "GATE2345",
      bundle,
      keys,
      {
        usedSince: { [id]: 1 },
      },
      NOW,
    );
    expect(check).toMatchObject({ result: { reason: "used_up" } });
  });

  it("accepts a scanned token as well as a typed code", async () => {
    const bundle = await buildGateBundle(db, DEMO_ESTATE_ID, key, NOW);
    const keys = await importPublicKeys(bundle.keys);
    const token = bundle.passes.find((p) => p.shortCode === "GATE2345")!.token;
    const check = await checkAtGate(
      token,
      bundle,
      keys,
      { usedSince: {} },
      NOW,
    );
    expect(check).toMatchObject({ result: { ok: true } });
  });
});

describe("recording gate events", () => {
  it("stores an entry against the pass's own unit", async () => {
    const id = await passId("GATE2345");
    const e = event({ passId: id, unitId: null });
    expect(await recordGateEvents(db, guard, [e])).toEqual({
      accepted: [e.id],
      rejected: [],
    });
    const [stored] = await db
      .select()
      .from(schema.entryEvent)
      .where(eq(schema.entryEvent.id, e.id));
    expect(stored).toMatchObject({ guardId: guard.personId, kind: "entry" });
    expect(stored!.unitId).not.toBeNull();
  });

  it("accepts a retried upload without storing it twice", async () => {
    const e = event({ passId: await passId("GATE2345") });
    const before = await db.$count(schema.entryEvent);
    await recordGateEvents(db, guard, [e]);
    expect(await recordGateEvents(db, guard, [e])).toEqual({
      accepted: [e.id],
      rejected: [],
    });
    expect(await db.$count(schema.entryEvent)).toBe(before + 1);
  });

  it("rejects a pass from another estate, and keeps the rest", async () => {
    const [other] = await db
      .insert(schema.estate)
      .values({ name: "Elsewhere" })
      .returning();
    const [unit] = await db
      .insert(schema.unit)
      .values({ estateId: other!.id, label: "9" })
      .returning();
    const [resident] = await db
      .insert(schema.person)
      .values({ estateId: other!.id, name: "R", role: "resident" })
      .returning();
    const [foreign] = await db
      .insert(schema.pass)
      .values({
        estateId: other!.id,
        unitId: unit!.id,
        createdBy: resident!.id,
        shortCode: "GATE2345",
        visitorName: "X",
        validFrom: NOW,
        validUntil: new Date(NOW.getTime() + 60 * 60 * 1000),
      })
      .returning();
    const good = event({ passId: await passId("GATE2345") });
    const bad = event({ passId: foreign!.id });
    expect(await recordGateEvents(db, guard, [good, bad])).toEqual({
      accepted: [good.id],
      rejected: [{ id: bad.id, error: "unknown pass" }],
    });
  });

  it("refuses everything from someone who is not a guard", async () => {
    const e = event({ passId: await passId("GATE2345") });
    const resident = { ...guard, role: "resident" as const };
    expect(await recordGateEvents(db, resident, [e])).toEqual({
      accepted: [],
      rejected: [{ id: e.id, error: "not allowed" }],
    });
  });

  it("shows new events at the top of the log, with the guard's name", async () => {
    const e = event({
      passId: await passId("GATE2345"),
      deviceTime: new Date(NOW.getTime() + 60_000).toISOString(),
    });
    await recordGateEvents(db, guard, [e]);
    const [newest] = await recentGateLog(db, DEMO_ESTATE_ID);
    expect(newest).toMatchObject({
      id: e.id,
      kind: "entry",
      unitLabel: "A1",
      guardName: "Juma Hassan",
    });
  });

  it("shows a resident only their own unit's events", async () => {
    const units = await db
      .select({ id: schema.unit.id, label: schema.unit.label })
      .from(schema.unit);
    const b1 = units.find((u) => u.label === "B1")!.id;
    const rows = await recentGateLog(db, DEMO_ESTATE_ID, 50, {
      unitIds: [b1],
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.unitLabel === "B1")).toBe(true);
    expect(
      await recentGateLog(db, DEMO_ESTATE_ID, 50, { unitIds: [] }),
    ).toEqual([]);
  });
});
