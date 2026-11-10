import {
  compactVerify,
  decodeProtectedHeader,
  type CryptoKey,
  SignJWT,
} from "jose";

/** ES256 everywhere: see docs/adr/0001-signed-pass-format.md. */
export const PASS_ALG = "ES256";

/** Allowed drift between the device clock and the pass window. */
export const CLOCK_TOLERANCE_SECONDS = 120;

export const MIN_WINDOW_SECONDS = 60;
export const MAX_WINDOW_SECONDS = 24 * 60 * 60;
export const MAX_USES = 10;
const MAX_NAME_LENGTH = 80;

/** What a pass says, as signed. Times are Unix seconds. */
export type PassClaims = {
  passId: string;
  estateId: string;
  unitId: string;
  unitLabel: string;
  visitorName: string;
  validFrom: number;
  validUntil: number;
  maxUses: number;
};

export type PassInput = Omit<PassClaims, "validFrom" | "validUntil"> & {
  validFrom: Date;
  validUntil: Date;
};

export type SigningKey = { kid: string; privateKey: CryptoKey };

export const REFUSAL_REASONS = [
  "unreadable",
  "unknown_key",
  "bad_signature",
  "wrong_estate",
  "not_yet_valid",
  "expired",
  "cancelled",
  "used_up",
] as const;

export type RefusalReason = (typeof REFUSAL_REASONS)[number];

export type VerifyResult =
  | { ok: true; pass: PassClaims }
  | { ok: false; reason: RefusalReason; pass?: PassClaims };

/** What the device knows when it checks a pass, all of it available offline. */
export type VerifyContext = {
  estateId: string;
  /** The estate's public keys by `kid`. */
  keys: ReadonlyMap<string, CryptoKey>;
  now: Date;
  /** Pass ids cancelled as of the last sync. */
  revoked: ReadonlySet<string>;
  /** Entries already recorded against a pass, on this device and from the last sync. */
  usesSeen: (passId: string) => number;
};

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** Every rule a new pass breaks, empty when it may be issued. */
export function passRuleErrors(input: PassInput, now: Date): string[] {
  const errors: string[] = [];
  const from = seconds(input.validFrom);
  const until = seconds(input.validUntil);
  const name = input.visitorName.trim();
  if (!name) errors.push("visitor name is required");
  if (name.length > MAX_NAME_LENGTH)
    errors.push(`visitor name is longer than ${MAX_NAME_LENGTH} characters`);
  if (!input.unitLabel.trim()) errors.push("unit label is required");
  if (Number.isNaN(from) || Number.isNaN(until))
    errors.push("validity dates are invalid");
  else {
    if (until - from < MIN_WINDOW_SECONDS)
      errors.push("a pass must be valid for at least a minute");
    if (until - from > MAX_WINDOW_SECONDS)
      errors.push("a pass can be valid for at most 24 hours");
    if (until <= seconds(now)) errors.push("a pass must end in the future");
  }
  if (!Number.isInteger(input.maxUses) || input.maxUses < 1)
    errors.push("a pass must allow at least one entry");
  if (input.maxUses > MAX_USES)
    errors.push(`a pass can allow at most ${MAX_USES} entries`);
  return errors;
}

/** Signs a new pass on the server; throws if the pass breaks a rule. */
export async function issuePass(
  input: PassInput,
  key: SigningKey,
  now = new Date(),
): Promise<string> {
  const errors = passRuleErrors(input, now);
  if (errors.length > 0)
    throw new Error(`Pass not issued: ${errors.join("; ")}`);
  return signPass(input, key, now);
}

/** Signs a pass that was already checked when it was created, e.g. to hand a stored pass to a gate device. */
export async function signPass(
  input: PassInput,
  key: SigningKey,
  now = new Date(),
): Promise<string> {
  return new SignJWT({
    est: input.estateId,
    unit: input.unitId,
    unitLabel: input.unitLabel.trim(),
    name: input.visitorName.trim(),
    uses: input.maxUses,
  })
    .setProtectedHeader({ alg: PASS_ALG, kid: key.kid, typ: "pass+jwt" })
    .setJti(input.passId)
    .setNotBefore(seconds(input.validFrom))
    .setExpirationTime(seconds(input.validUntil))
    .setIssuedAt(seconds(now))
    .sign(key.privateKey);
}

function readClaims(payload: Uint8Array): PassClaims | null {
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(payload));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as Record<string, unknown>;
  const str = (v: unknown) => typeof v === "string" && v.length > 0;
  const int = (v: unknown) => Number.isInteger(v);
  if (
    !str(c.jti) ||
    !str(c.est) ||
    !str(c.unit) ||
    !str(c.unitLabel) ||
    !str(c.name) ||
    !int(c.nbf) ||
    !int(c.exp) ||
    !int(c.uses)
  )
    return null;
  return {
    passId: c.jti as string,
    estateId: c.est as string,
    unitId: c.unit as string,
    unitLabel: c.unitLabel as string,
    visitorName: c.name as string,
    validFrom: c.nbf as number,
    validUntil: c.exp as number,
    maxUses: c.uses as number,
  };
}

/** Decides ADMIT or REFUSE on the device, offline, checking in the order ADR 1 sets out. */
export async function verifyPass(
  token: string,
  ctx: VerifyContext,
): Promise<VerifyResult> {
  let kid: string | undefined;
  try {
    const header = decodeProtectedHeader(token.trim());
    if (header.alg !== PASS_ALG) return { ok: false, reason: "unreadable" };
    kid = header.kid;
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  const key = kid ? ctx.keys.get(kid) : undefined;
  if (!key) return { ok: false, reason: "unknown_key" };

  let payload: Uint8Array;
  try {
    ({ payload } = await compactVerify(token.trim(), key, {
      algorithms: [PASS_ALG],
    }));
  } catch {
    return { ok: false, reason: "bad_signature" };
  }

  const pass = readClaims(payload);
  if (!pass) return { ok: false, reason: "unreadable" };

  const now = seconds(ctx.now);
  if (pass.estateId !== ctx.estateId)
    return { ok: false, reason: "wrong_estate", pass };
  if (now < pass.validFrom - CLOCK_TOLERANCE_SECONDS)
    return { ok: false, reason: "not_yet_valid", pass };
  if (now >= pass.validUntil + CLOCK_TOLERANCE_SECONDS)
    return { ok: false, reason: "expired", pass };
  if (ctx.revoked.has(pass.passId))
    return { ok: false, reason: "cancelled", pass };
  if (ctx.usesSeen(pass.passId) >= pass.maxUses)
    return { ok: false, reason: "used_up", pass };
  return { ok: true, pass };
}
