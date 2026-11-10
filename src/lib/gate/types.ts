import type { JWK } from "jose";
import type { RefusalReason } from "../pass/token";

/** Everything a gate device needs to check passes on its own: see ADR 1. */
export type GateBundle = {
  estateId: string;
  estateName: string;
  /** When the server built this bundle (ISO time). */
  builtAt: string;
  /** Public keys only. */
  keys: JWK[];
  /** Signed passes around today, by short code, so a typed code can be checked too. */
  passes: { shortCode: string; token: string }[];
  /** Pass ids cancelled as of `builtAt`. */
  revoked: string[];
  /** Entries already recorded per pass id, as of `builtAt`. */
  uses: Record<string, number>;
};

export const ENTRY_KINDS = ["entry", "exit", "refusal"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

/** One thing that happened at the gate, as the device reports it. The id is made on the device. */
export type GateEventInput = {
  id: string;
  passId: string | null;
  unitId: string | null;
  visitorName: string | null;
  kind: EntryKind;
  reason: RefusalReason | null;
  deviceId: string;
  /** ISO time from the device clock. */
  deviceTime: string;
};
