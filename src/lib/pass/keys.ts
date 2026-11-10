import {
  type CryptoKey,
  exportJWK,
  generateKeyPair,
  importJWK,
  type JWK,
} from "jose";
import { PASS_ALG, type SigningKey } from "./token";

export type KeyPairJwk = { kid: string; privateJwk: JWK; publicJwk: JWK };

/** A new signing key pair; the kid carries the creation date so rotation is easy to read. */
export async function generateSigningKey(
  now = new Date(),
): Promise<KeyPairJwk> {
  const { privateKey, publicKey } = await generateKeyPair(PASS_ALG, {
    extractable: true,
  });
  const suffix = crypto.randomUUID().slice(0, 8);
  const kid = `${now.toISOString().slice(0, 10)}-${suffix}`;
  const meta = { kid, alg: PASS_ALG, use: "sig" };
  return {
    kid,
    privateJwk: { ...(await exportJWK(privateKey)), ...meta },
    publicJwk: { ...(await exportJWK(publicKey)), ...meta },
  };
}

/** The public half of a JWK, safe to send to a guard device. */
export function publicPart(jwk: JWK): JWK {
  const { kty, crv, x, y, kid, alg, use } = jwk;
  return { kty, crv, x, y, kid, alg, use };
}

export async function importSigningKey(privateJwk: JWK): Promise<SigningKey> {
  if (!privateJwk.kid) throw new Error("Signing key has no kid");
  if (!privateJwk.d) throw new Error("Signing key is not a private key");
  const privateKey = (await importJWK(privateJwk, PASS_ALG)) as CryptoKey;
  return { kid: privateJwk.kid, privateKey };
}

/** Public keys by kid, as the device's verifier wants them. */
export async function importPublicKeys(
  jwks: readonly JWK[],
): Promise<Map<string, CryptoKey>> {
  const keys = new Map<string, CryptoKey>();
  for (const jwk of jwks) {
    if (!jwk.kid) continue;
    keys.set(
      jwk.kid,
      (await importJWK(publicPart(jwk), PASS_ALG)) as CryptoKey,
    );
  }
  return keys;
}

/** The server's signing key, from PASS_SIGNING_KEY; never call this in client code. */
export async function loadSigningKey(
  env: Record<string, string | undefined> = process.env,
): Promise<SigningKey> {
  const raw = env.PASS_SIGNING_KEY;
  if (!raw)
    throw new Error(
      "PASS_SIGNING_KEY is not set. Run `npm run keys:generate` and put the result in .env.local.",
    );
  return importSigningKey(JSON.parse(raw) as JWK);
}
