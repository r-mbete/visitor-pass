import { REFUSAL_REASONS, type RefusalReason } from "../pass/token";
import { ENTRY_KINDS, type EntryKind, type GateEventInput } from "./types";

/** Most events a device may upload at once. */
export const MAX_EVENTS_PER_UPLOAD = 200;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedUpload = {
  events: GateEventInput[];
  /** Events that could not be read, by position in the upload. */
  errors: { index: number; error: string }[];
};

function parseEvent(raw: unknown): GateEventInput | string {
  if (typeof raw !== "object" || raw === null) return "not an object";
  const e = raw as Record<string, unknown>;
  const optionalId = (v: unknown) =>
    v === null || v === undefined || (typeof v === "string" && UUID.test(v));

  if (typeof e.id !== "string" || !UUID.test(e.id)) return "id must be a uuid";
  if (!optionalId(e.passId)) return "passId must be a uuid or null";
  if (!optionalId(e.unitId)) return "unitId must be a uuid or null";
  if (!ENTRY_KINDS.includes(e.kind as EntryKind))
    return "kind must be entry, exit or refusal";
  const kind = e.kind as EntryKind;
  const reason = e.reason ?? null;
  if (kind === "refusal") {
    if (!REFUSAL_REASONS.includes(reason as RefusalReason))
      return "a refusal needs a known reason";
  } else if (reason !== null) return "only a refusal has a reason";
  if (kind !== "refusal" && !e.passId)
    return "an entry or exit must name its pass";
  if (typeof e.deviceId !== "string" || !e.deviceId.trim())
    return "deviceId is required";
  if (
    typeof e.deviceTime !== "string" ||
    Number.isNaN(Date.parse(e.deviceTime))
  )
    return "deviceTime must be an ISO time";
  const name = e.visitorName ?? null;
  if (name !== null && (typeof name !== "string" || name.length > 80))
    return "visitorName must be text of at most 80 characters";

  return {
    id: e.id.toLowerCase(),
    passId: (e.passId as string | null | undefined) ?? null,
    unitId: (e.unitId as string | null | undefined) ?? null,
    visitorName: name as string | null,
    kind,
    reason: reason as RefusalReason | null,
    deviceId: e.deviceId.trim(),
    deviceTime: new Date(e.deviceTime).toISOString(),
  };
}

/** Reads an upload from a gate device; each event is accepted or rejected on its own. */
export function parseUpload(body: unknown): ParsedUpload | string {
  if (typeof body !== "object" || body === null)
    return "body must be an object";
  const events = (body as { events?: unknown }).events;
  if (!Array.isArray(events)) return "events must be a list";
  if (events.length > MAX_EVENTS_PER_UPLOAD)
    return `at most ${MAX_EVENTS_PER_UPLOAD} events per upload`;
  const parsed: ParsedUpload = { events: [], errors: [] };
  events.forEach((raw, index) => {
    const event = parseEvent(raw);
    if (typeof event === "string") parsed.errors.push({ index, error: event });
    else parsed.events.push(event);
  });
  return parsed;
}
