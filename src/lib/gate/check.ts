import type { CryptoKey } from "jose";
import { normaliseShortCode } from "../pass/short-code";
import { type VerifyResult, verifyPass } from "../pass/token";
import type { GateBundle } from "./types";

export type GateCheck =
  | { kind: "empty" }
  | { kind: "not_a_code" }
  | { kind: "unknown_code"; code: string }
  | { kind: "checked"; result: VerifyResult };

/** What the device knows beyond the bundle: entries it has recorded since the bundle was built. */
export type LocalState = { usedSince: Record<string, number> };

/** Looks up a typed short code or takes a scanned token, then verifies it offline. */
export async function checkAtGate(
  typed: string,
  bundle: GateBundle,
  keys: ReadonlyMap<string, CryptoKey>,
  local: LocalState,
  now: Date,
): Promise<GateCheck> {
  const input = typed.trim();
  if (!input) return { kind: "empty" };

  let token: string;
  if (input.split(".").length === 3) {
    token = input;
  } else {
    const code = normaliseShortCode(input);
    if (!code) return { kind: "not_a_code" };
    const found = bundle.passes.find((p) => p.shortCode === code);
    if (!found) return { kind: "unknown_code", code };
    token = found.token;
  }

  const revoked = new Set(bundle.revoked);
  const result = await verifyPass(token, {
    estateId: bundle.estateId,
    keys,
    now,
    revoked,
    usesSeen: (passId) =>
      (bundle.uses[passId] ?? 0) + (local.usedSince[passId] ?? 0),
  });
  return { kind: "checked", result };
}
