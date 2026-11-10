import { beforeAll, describe, expect, it } from "vitest";
import { DEMO_ESTATE_ID, seedDemoEstate } from "@/db/demo-estate";
import { createTestDb } from "@/db/test-db";
import type { Db } from "@/db/types";
import { startOfDay } from "../format";
import { generateSigningKey, importSigningKey } from "../pass/keys";
import { passOverview, todaySummary } from "./overview";
import { buildGateBundle } from "./server";

// 12:30 in Nairobi.
const NOW = new Date("2026-11-10T09:30:00Z");
let db: Db;

beforeAll(async () => {
  db = await createTestDb();
  await seedDemoEstate(db, NOW);
});

describe("the dashboard's numbers for the demo estate", () => {
  it("give each pass the status the gate would", async () => {
    const key = await importSigningKey((await generateSigningKey()).privateJwk);
    const bundle = await buildGateBundle(db, DEMO_ESTATE_ID, key, NOW);
    const statuses = Object.fromEntries(
      (await passOverview(bundle, NOW)).map((p) => [p.shortCode, p.status]),
    );
    expect(statuses).toEqual({
      GATE2345: "admit",
      MVULE234: "admit",
      SALAMA22: "not_yet_valid",
      PASS2345: "cancelled",
      NYUMBA23: "expired",
      BARAZA27: "used_up",
    });
  });

  it("count today's entries and refusals, and who is still inside", async () => {
    const today = await todaySummary(db, DEMO_ESTATE_ID, startOfDay(NOW));
    // Mary and Halima came and went; Tom came in and has not left.
    expect(today.entries).toBe(3);
    expect(today.refusals).toBe(1);
    expect(today.inside.map((v) => v.visitorName)).toEqual(["Tom Barasa"]);
  });

  it("ignore what happened before today", async () => {
    const tomorrow = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
    const today = await todaySummary(db, DEMO_ESTATE_ID, startOfDay(tomorrow));
    expect(today).toEqual({ entries: 0, refusals: 0, inside: [] });
  });
});
