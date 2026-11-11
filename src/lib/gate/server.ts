import "server-only";
import { and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Db } from "@/db/types";
import { type Actor, can } from "../access/permissions";
import type { ServerSigningKey } from "../pass/keys";
import { signPass } from "../pass/token";
import type { GateBundle, GateEventInput } from "./types";

const DAY = 24 * 60 * 60 * 1000;

/** Passes from a day either side of `now`: enough to admit today's visitors and explain yesterday's. */
export async function buildGateBundle(
  db: Db,
  estateId: string,
  key: ServerSigningKey,
  now = new Date(),
): Promise<GateBundle> {
  const [estate] = await db
    .select({ name: schema.estate.name })
    .from(schema.estate)
    .where(eq(schema.estate.id, estateId));
  if (!estate) throw new Error(`No estate ${estateId}`);

  const rows = await db
    .select({ pass: schema.pass, unitLabel: schema.unit.label })
    .from(schema.pass)
    .innerJoin(schema.unit, eq(schema.pass.unitId, schema.unit.id))
    .where(
      and(
        eq(schema.pass.estateId, estateId),
        gte(schema.pass.validUntil, new Date(now.getTime() - DAY)),
        lte(schema.pass.validFrom, new Date(now.getTime() + DAY)),
      ),
    );

  const ids = rows.map((r) => r.pass.id);
  const used =
    ids.length === 0
      ? []
      : await db
          .select({ passId: schema.entryEvent.passId, n: count() })
          .from(schema.entryEvent)
          .where(
            and(
              inArray(schema.entryEvent.passId, ids),
              eq(schema.entryEvent.kind, "entry"),
            ),
          )
          .groupBy(schema.entryEvent.passId);

  const passes = await Promise.all(
    rows.map(async ({ pass, unitLabel }) => ({
      shortCode: pass.shortCode,
      token: await signPass(
        {
          passId: pass.id,
          estateId: pass.estateId,
          unitId: pass.unitId,
          unitLabel,
          visitorName: pass.visitorName,
          validFrom: pass.validFrom,
          validUntil: pass.validUntil,
          maxUses: pass.maxUses,
        },
        key,
        now,
      ),
    })),
  );

  return {
    estateId,
    estateName: estate.name,
    builtAt: now.toISOString(),
    keys: [key.publicJwk],
    passes,
    revoked: rows
      .filter((r) => r.pass.status === "cancelled")
      .map((r) => r.pass.id),
    uses: Object.fromEntries(used.map((u) => [u.passId!, u.n])),
  };
}

export type RecordResult = {
  /** Stored now, or already stored by an earlier upload: either way the device can forget them. */
  accepted: string[];
  rejected: { id: string; error: string }[];
};

/** Stores what a gate device reports. Safe to retry: an event id already stored is accepted again, not duplicated. */
export async function recordGateEvents(
  db: Db,
  actor: Actor,
  events: readonly GateEventInput[],
): Promise<RecordResult> {
  if (!can(actor, { do: "entry.record", estateId: actor.estateId }))
    return {
      accepted: [],
      rejected: events.map((e) => ({ id: e.id, error: "not allowed" })),
    };

  // A device may only report on passes and units in its own estate.
  const passIds = [
    ...new Set(events.flatMap((e) => (e.passId ? [e.passId] : []))),
  ];
  const unitIds = [
    ...new Set(events.flatMap((e) => (e.unitId ? [e.unitId] : []))),
  ];
  const passes =
    passIds.length === 0
      ? []
      : await db
          .select({ id: schema.pass.id, unitId: schema.pass.unitId })
          .from(schema.pass)
          .where(
            and(
              inArray(schema.pass.id, passIds),
              eq(schema.pass.estateId, actor.estateId),
            ),
          );
  const units =
    unitIds.length === 0
      ? []
      : await db
          .select({ id: schema.unit.id })
          .from(schema.unit)
          .where(
            and(
              inArray(schema.unit.id, unitIds),
              eq(schema.unit.estateId, actor.estateId),
            ),
          );
  const passUnit = new Map(passes.map((p) => [p.id, p.unitId]));
  const knownUnits = new Set(units.map((u) => u.id));

  const result: RecordResult = { accepted: [], rejected: [] };
  const rows: (typeof schema.entryEvent.$inferInsert)[] = [];
  for (const e of events) {
    if (e.passId && !passUnit.has(e.passId)) {
      result.rejected.push({ id: e.id, error: "unknown pass" });
      continue;
    }
    if (e.unitId && !knownUnits.has(e.unitId)) {
      result.rejected.push({ id: e.id, error: "unknown unit" });
      continue;
    }
    rows.push({
      id: e.id,
      estateId: actor.estateId,
      passId: e.passId,
      // The pass decides the unit; a device cannot move a visitor to another one.
      unitId: (e.passId && passUnit.get(e.passId)) || e.unitId,
      visitorName: e.visitorName,
      guardId: actor.personId,
      deviceId: e.deviceId,
      kind: e.kind,
      reason: e.reason,
      deviceTime: new Date(e.deviceTime),
    });
  }

  if (rows.length > 0) {
    await db.insert(schema.entryEvent).values(rows).onConflictDoNothing();
    // An id that was already stored must belong to this estate, or it is someone else's event.
    const stored = await db
      .select({
        id: schema.entryEvent.id,
        estateId: schema.entryEvent.estateId,
      })
      .from(schema.entryEvent)
      .where(
        inArray(
          schema.entryEvent.id,
          rows.map((r) => r.id),
        ),
      );
    const ours = new Set(
      stored.filter((s) => s.estateId === actor.estateId).map((s) => s.id),
    );
    for (const r of rows) {
      if (ours.has(r.id)) result.accepted.push(r.id);
      else result.rejected.push({ id: r.id, error: "id already used" });
    }
  }
  return result;
}

export type LogRow = {
  id: string;
  kind: "entry" | "exit" | "refusal";
  reason: string | null;
  visitorName: string | null;
  unitLabel: string | null;
  guardName: string;
  deviceTime: Date;
};

/** The newest gate events for an estate, or only for some of its units (a resident's own). */
export async function recentGateLog(
  db: Db,
  estateId: string,
  limit = 20,
  only: { unitIds?: readonly string[] } = {},
): Promise<LogRow[]> {
  if (only.unitIds?.length === 0) return [];
  return db
    .select({
      id: schema.entryEvent.id,
      kind: schema.entryEvent.kind,
      reason: schema.entryEvent.reason,
      visitorName: schema.entryEvent.visitorName,
      unitLabel: schema.unit.label,
      guardName: schema.person.name,
      deviceTime: schema.entryEvent.deviceTime,
    })
    .from(schema.entryEvent)
    .innerJoin(schema.person, eq(schema.entryEvent.guardId, schema.person.id))
    .leftJoin(schema.unit, eq(schema.entryEvent.unitId, schema.unit.id))
    .where(
      and(
        eq(schema.entryEvent.estateId, estateId),
        only.unitIds
          ? inArray(schema.entryEvent.unitId, [...only.unitIds])
          : undefined,
      ),
    )
    .orderBy(desc(schema.entryEvent.deviceTime))
    .limit(limit);
}
