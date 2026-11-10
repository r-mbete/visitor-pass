import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { generateSigningKey, importPublicKeys, importSigningKey } from "./keys";
import {
  CLOCK_TOLERANCE_SECONDS,
  issuePass,
  passRuleErrors,
  type PassInput,
  type SigningKey,
  type VerifyContext,
  verifyPass,
} from "./token";

const NOW = new Date("2026-11-10T08:00:00Z");
const HOUR = 60 * 60 * 1000;
const at = (ms: number) => new Date(NOW.getTime() + ms);

const input = (over: Partial<PassInput> = {}): PassInput => ({
  passId: "pass-1",
  estateId: "estate-1",
  unitId: "unit-b4",
  unitLabel: "B4",
  visitorName: "Amina Otieno",
  validFrom: NOW,
  validUntil: at(4 * HOUR),
  maxUses: 1,
  ...over,
});

let signer: SigningKey;
let otherSigner: SigningKey;
let ctx: VerifyContext;

beforeAll(async () => {
  const pair = await generateSigningKey(NOW);
  const other = await generateSigningKey(NOW);
  signer = await importSigningKey(pair.privateJwk);
  otherSigner = await importSigningKey({ ...other.privateJwk, kid: pair.kid });
  ctx = {
    estateId: "estate-1",
    keys: await importPublicKeys([pair.publicJwk]),
    now: at(HOUR),
    revoked: new Set(),
    usesSeen: () => 0,
  };
});

describe("issuing a pass", () => {
  it("accepts a normal pass", () => {
    expect(passRuleErrors(input(), NOW)).toEqual([]);
  });

  it.each([
    [
      "an empty visitor name",
      { visitorName: "  " },
      "visitor name is required",
    ],
    [
      "a window under a minute",
      { validUntil: at(30_000) },
      "at least a minute",
    ],
    [
      "a window over 24 hours",
      { validUntil: at(25 * HOUR) },
      "at most 24 hours",
    ],
    [
      "a pass that has already ended",
      { validFrom: at(-3 * HOUR), validUntil: at(-HOUR) },
      "end in the future",
    ],
    ["zero uses", { maxUses: 0 }, "at least one entry"],
    ["too many uses", { maxUses: 11 }, "at most 10 entries"],
    ["fractional uses", { maxUses: 1.5 }, "at least one entry"],
  ])("refuses %s", (_, over, message) => {
    expect(passRuleErrors(input(over), NOW).join("; ")).toContain(message);
  });

  it("will not sign a pass that breaks a rule", async () => {
    await expect(issuePass(input({ maxUses: 0 }), signer, NOW)).rejects.toThrow(
      /Pass not issued/,
    );
  });

  it("produces a compact token small enough for a QR code", async () => {
    const token = await issuePass(input(), signer, NOW);
    expect(token.split(".")).toHaveLength(3);
    expect(token.length).toBeLessThan(500);
  });
});

describe("verifying a pass at the gate", () => {
  it("admits a valid pass and shows who it is for", async () => {
    const token = await issuePass(input(), signer, NOW);
    const result = await verifyPass(token, ctx);
    expect(result).toEqual({
      ok: true,
      pass: expect.objectContaining({
        passId: "pass-1",
        unitLabel: "B4",
        visitorName: "Amina Otieno",
        maxUses: 1,
      }),
    });
  });

  it("ignores spaces around a scanned token", async () => {
    const token = await issuePass(input(), signer, NOW);
    expect((await verifyPass(`  ${token}\n`, ctx)).ok).toBe(true);
  });

  it("refuses something that is not a pass", async () => {
    expect(await verifyPass("hello", ctx)).toEqual({
      ok: false,
      reason: "unreadable",
    });
  });

  it("refuses a pass signed with an algorithm other than ES256", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256", kid: signer.kid })
      .sign(new Uint8Array(32));
    expect(await verifyPass(token, ctx)).toMatchObject({
      reason: "unreadable",
    });
  });

  it("refuses a pass signed by a key the device does not know", async () => {
    const stranger = await importSigningKey(
      (await generateSigningKey(NOW)).privateJwk,
    );
    const token = await issuePass(input(), stranger, NOW);
    expect(await verifyPass(token, ctx)).toMatchObject({
      reason: "unknown_key",
    });
  });

  it("refuses a forged pass that claims a known key id", async () => {
    const token = await issuePass(input(), otherSigner, NOW);
    expect(await verifyPass(token, ctx)).toMatchObject({
      reason: "bad_signature",
    });
  });

  it("refuses a pass whose contents were changed after signing", async () => {
    const [header, , signature] = (await issuePass(input(), signer, NOW)).split(
      ".",
    );
    const forged = Buffer.from(
      JSON.stringify({
        jti: "pass-1",
        est: "estate-1",
        unit: "unit-b4",
        unitLabel: "B4",
        name: "Amina Otieno",
        nbf: 0,
        exp: 9_999_999_999,
        uses: 10,
      }),
    ).toString("base64url");
    expect(
      await verifyPass(`${header}.${forged}.${signature}`, ctx),
    ).toMatchObject({ reason: "bad_signature" });
  });

  it("refuses a pass for another estate", async () => {
    const token = await issuePass(input({ estateId: "estate-2" }), signer, NOW);
    expect(await verifyPass(token, ctx)).toMatchObject({
      reason: "wrong_estate",
    });
  });

  it("refuses a pass before its window opens", async () => {
    const token = await issuePass(
      input({ validFrom: at(3 * HOUR), validUntil: at(5 * HOUR) }),
      signer,
      NOW,
    );
    expect(await verifyPass(token, ctx)).toMatchObject({
      reason: "not_yet_valid",
      pass: expect.objectContaining({ visitorName: "Amina Otieno" }),
    });
  });

  it("refuses a pass after its window closes", async () => {
    const token = await issuePass(input(), signer, NOW);
    expect(
      await verifyPass(token, { ...ctx, now: at(5 * HOUR) }),
    ).toMatchObject({ reason: "expired" });
  });

  it("allows for a device clock that is slightly off", async () => {
    const token = await issuePass(input(), signer, NOW);
    const drift = (CLOCK_TOLERANCE_SECONDS - 1) * 1000;
    expect(
      (await verifyPass(token, { ...ctx, now: at(4 * HOUR + drift) })).ok,
    ).toBe(true);
    expect((await verifyPass(token, { ...ctx, now: at(-drift) })).ok).toBe(
      true,
    );
    expect(
      await verifyPass(token, {
        ...ctx,
        now: at(4 * HOUR + CLOCK_TOLERANCE_SECONDS * 1000),
      }),
    ).toMatchObject({ reason: "expired" });
  });

  it("refuses a cancelled pass", async () => {
    const token = await issuePass(input(), signer, NOW);
    expect(
      await verifyPass(token, { ...ctx, revoked: new Set(["pass-1"]) }),
    ).toMatchObject({ reason: "cancelled" });
  });

  it("refuses a pass that has used all its entries", async () => {
    const token = await issuePass(input({ maxUses: 2 }), signer, NOW);
    expect((await verifyPass(token, { ...ctx, usesSeen: () => 1 })).ok).toBe(
      true,
    );
    expect(
      await verifyPass(token, { ...ctx, usesSeen: () => 2 }),
    ).toMatchObject({ reason: "used_up" });
  });

  it("reports the earliest failing check when several fail", async () => {
    const token = await issuePass(input({ estateId: "estate-2" }), signer, NOW);
    const result = await verifyPass(token, {
      ...ctx,
      now: at(10 * HOUR),
      revoked: new Set(["pass-1"]),
    });
    expect(result).toMatchObject({ reason: "wrong_estate" });
  });
});
