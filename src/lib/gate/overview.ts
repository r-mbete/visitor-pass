import "server-only";
import { and, eq, gte } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Db } from "@/db/types";
import { importPublicKeys } from "../pass/keys";
import type { PassClaims } from "../pass/token";
import { checkAtGate } from "./check";
import type { GateBundle } from "./types";

export type PassStatus =
  "admit" | "not_yet_valid" | "expired" | "cancelled" | "used_up" | "invalid";

export type PassSummary = {
  shortCode: string;
  token: string;
  pass: PassClaims;
  status: PassStatus;
  used: number;
};

/** Every pass in the bundle with the status the gate would give it now, earliest first. */
export async function passOverview(
  bundle: GateBundle,
  now = new Date(),
): Promise<PassSummary[]> {
  const keys = await importPublicKeys(bundle.keys);
  const rows: PassSummary[] = [];
  for (const { shortCode, token } of bundle.passes) {
    const check = await checkAtGate(
      token,
      bundle,
      keys,
      { usedSince: {} },
      now,
    );
    if (check.kind !== "checked" || !check.result.pass) continue;
    const { result } = check;
    const status: PassStatus = result.ok
      ? "admit"
      : ((["not_yet_valid", "expired", "cancelled", "used_up"] as const).find(
          (s) => s === result.reason,
        ) ?? "invalid");
    rows.push({
      shortCode,
      token,
      pass: result.pass!,
      status,
      used: bundle.uses[result.pass!.passId] ?? 0,
    });
  }
  return rows.sort((a, b) => a.pass.validFrom - b.pass.validFrom);
}

export type TodaySummary = {
  entries: number;
  refusals: number;
  /** Visitors who came in and have not been seen leaving, newest first. */
  inside: {
    passId: string;
    visitorName: string;
    unitLabel: string;
    since: Date;
  }[];
};

/** What has happened at the gate since `since` (the start of today). */
export async function todaySummary(
  db: Db,
  estateId: string,
  since: Date,
): Promise<TodaySummary> {
  const events = await db
    .select({
      passId: schema.entryEvent.passId,
      kind: schema.entryEvent.kind,
      visitorName: schema.entryEvent.visitorName,
      unitLabel: schema.unit.label,
      at: schema.entryEvent.deviceTime,
    })
    .from(schema.entryEvent)
    .leftJoin(schema.unit, eq(schema.entryEvent.unitId, schema.unit.id))
    .where(
      and(
        eq(schema.entryEvent.estateId, estateId),
        gte(schema.entryEvent.deviceTime, since),
      ),
    )
    .orderBy(schema.entryEvent.deviceTime);

  const balance = new Map<
    string,
    { n: number; visitorName: string; unitLabel: string; since: Date }
  >();
  for (const e of events) {
    if (!e.passId || e.kind === "refusal") continue;
    const row = balance.get(e.passId) ?? {
      n: 0,
      visitorName: e.visitorName ?? "Visitor",
      unitLabel: e.unitLabel ?? "?",
      since: e.at,
    };
    row.n += e.kind === "entry" ? 1 : -1;
    if (e.kind === "entry") row.since = e.at;
    balance.set(e.passId, row);
  }

  return {
    entries: events.filter((e) => e.kind === "entry").length,
    refusals: events.filter((e) => e.kind === "refusal").length,
    inside: [...balance.entries()]
      .filter(([, r]) => r.n > 0)
      .map(([passId, r]) => ({
        passId,
        visitorName: r.visitorName,
        unitLabel: r.unitLabel,
        since: r.since,
      }))
      .sort((a, b) => b.since.getTime() - a.since.getTime()),
  };
}
