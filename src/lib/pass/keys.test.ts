import { describe, expect, it } from "vitest";
import { generateSigningKey, loadSigningKey, publicPart } from "./keys";

describe("signing keys", () => {
  it("never put the private part in what devices are given", async () => {
    const { privateJwk } = await generateSigningKey();
    expect(privateJwk.d).toBeDefined();
    expect(publicPart(privateJwk).d).toBeUndefined();
    const loaded = await loadSigningKey({
      PASS_SIGNING_KEY: JSON.stringify(privateJwk),
    });
    expect(loaded.publicJwk.d).toBeUndefined();
    expect(loaded.publicJwk.kid).toBe(privateJwk.kid);
  });

  it("explain how to fix a missing key", async () => {
    await expect(loadSigningKey({})).rejects.toThrow(/keys:generate/);
  });

  it("refuse a public key where a private one is needed", async () => {
    const { publicJwk } = await generateSigningKey();
    await expect(
      loadSigningKey({ PASS_SIGNING_KEY: JSON.stringify(publicJwk) }),
    ).rejects.toThrow(/not a private key/);
  });
});
