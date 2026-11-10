import "server-only";
import { loadSigningKey, type ServerSigningKey } from "../pass/keys";

let cached: Promise<ServerSigningKey> | undefined;

/** The server's pass-signing key, imported once per server process. */
export function getSigningKey(): Promise<ServerSigningKey> {
  cached ??= loadSigningKey().catch((error: unknown) => {
    cached = undefined;
    throw error;
  });
  return cached;
}
