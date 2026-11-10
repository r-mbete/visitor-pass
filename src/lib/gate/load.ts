import "server-only";
import { getDb } from "@/db/client";
import type { Actor } from "../access/permissions";
import { demoGuard } from "./demo";
import { getSigningKey } from "./key";
import { buildGateBundle } from "./server";
import type { GateBundle } from "./types";

export type DemoGate =
  | { ok: true; guard: Actor & { name: string }; bundle: GateBundle }
  | { ok: false; problem: string };

/** Loads the demo guard and their bundle, or says which setup step is missing. */
export async function loadDemoGate(): Promise<DemoGate> {
  if (!process.env.DATABASE_URL)
    return { ok: false, problem: "The database is not configured." };
  if (!process.env.PASS_SIGNING_KEY)
    return { ok: false, problem: "There is no pass-signing key." };
  const db = getDb();
  let guard;
  try {
    guard = await demoGuard(db);
  } catch {
    return {
      ok: false,
      problem: "The database is not ready. Have the migrations been run?",
    };
  }
  if (!guard)
    return { ok: false, problem: "The demo estate has not been seeded." };
  const bundle = await buildGateBundle(
    db,
    guard.estateId,
    await getSigningKey(),
  );
  return { ok: true, guard, bundle };
}
