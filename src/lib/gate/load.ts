import "server-only";
import { getDb } from "@/db/client";
import { getSigningKey } from "./key";
import { buildGateBundle } from "./server";
import type { GateBundle } from "./types";

export type LoadedGate =
  { ok: true; bundle: GateBundle } | { ok: false; problem: string };

/** Today's passes for an estate, signed for the gate, or which setup step is missing. */
export async function loadGate(estateId: string): Promise<LoadedGate> {
  if (!process.env.PASS_SIGNING_KEY)
    return { ok: false, problem: "There is no pass-signing key." };
  const bundle = await buildGateBundle(
    getDb(),
    estateId,
    await getSigningKey(),
  );
  return { ok: true, bundle };
}
