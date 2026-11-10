import { and, eq, inArray } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  generateSigningKey,
  importPublicKeys,
  importSigningKey,
} from "../lib/pass/keys";
import { normaliseShortCode } from "../lib/pass/short-code";
import { issuePass, type VerifyContext, verifyPass } from "../lib/pass/token";
import { DEMO_ESTATE_ID, seedDemoEstate } from "./demo-estate";
import * as schema from "./schema";
import { createTestDb, resetTestDb } from "./test-db";
import type { Db } from "./types";

const NOW = new Date("2026-11-10T09:30:00Z");
let db: Db;

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  await resetTestDb(db);
});

describe("the demo estate seed", () => {
  it("can be run again without duplicating anything", async () => {
    const first = await seedDemoEstate(db, NOW);
    await seedDemoEstate(db, NOW);
    expect(await db.$count(schema.unit)).toBe(first.units);
    expect(await db.$count(schema.person)).toBe(first.people);
    expect(await db.$count(schema.pass)).toBe(first.passes);
    expect(await db.$count(schema.entryEvent)).toBe(first.events);
  });

  it("leaves other estates alone", async () => {
    const [other] = await db
      .insert(schema.estate)
      .values({ name: "Another estate" })
      .returning();
    await db.insert(schema.unit).values({ estateId: other!.id, label: "1" });
    await seedDemoEstate(db, NOW);
    await seedDemoEstate(db, NOW);
    expect(
      await db.$count(schema.unit, eq(schema.unit.estateId, other!.id)),
    ).toBe(1);
  });

  it("gives every resident a unit, and guards and the admin none", async () => {
    await seedDemoEstate(db, NOW);
    const people = await db.select().from(schema.person);
    const residencies = await db.select().from(schema.residency);
    const housed = new Set(residencies.map((r) => r.personId));
    for (const p of people)
      expect(housed.has(p.id), p.name).toBe(p.role === "resident");
  });

  it("uses short codes a guard could type", async () => {
    await seedDemoEstate(db, NOW);
    for (const p of await db.select().from(schema.pass))
      expect(normaliseShortCode(p.shortCode)).toBe(p.shortCode);
  });

  it("has passes that show each case at the gate", async () => {
    await seedDemoEstate(db, NOW);
    const pair = await generateSigningKey(NOW);
    const signer = await importSigningKey(pair.privateJwk);

    const passes = await db
      .select({ pass: schema.pass, unitLabel: schema.unit.label })
      .from(schema.pass)
      .innerJoin(schema.unit, eq(schema.pass.unitId, schema.unit.id));
    const entries = await db
      .select({ passId: schema.entryEvent.passId })
      .from(schema.entryEvent)
      .where(
        and(
          eq(schema.entryEvent.estateId, DEMO_ESTATE_ID),
          inArray(schema.entryEvent.kind, ["entry"]),
        ),
      );
    const ctx: VerifyContext = {
      estateId: DEMO_ESTATE_ID,
      keys: await importPublicKeys([pair.publicJwk]),
      now: NOW,
      revoked: new Set(
        passes
          .filter((p) => p.pass.status === "cancelled")
          .map((p) => p.pass.id),
      ),
      usesSeen: (passId) => entries.filter((e) => e.passId === passId).length,
    };

    const outcome: Record<string, string> = {};
    for (const { pass, unitLabel } of passes) {
      // Sign as of the pass's own start, so expired demo passes can still be issued for the test.
      const token = await issuePass(
        { ...pass, passId: pass.id, unitLabel },
        signer,
        new Date(pass.validFrom.getTime() + 1000),
      );
      const result = await verifyPass(token, ctx);
      outcome[pass.shortCode] = result.ok ? "admit" : result.reason;
    }

    expect(outcome).toEqual({
      GATE2345: "admit",
      SALAMA22: "not_yet_valid",
      MVULE234: "admit",
      PASS2345: "cancelled",
      NYUMBA23: "expired",
      BARAZA27: "used_up",
    });
  });
});
