/** 32 characters, without I, O, 0 and 1, so a code read aloud or off a cracked screen is not misread. */
export const SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const SHORT_CODE_LENGTH = 8;

/** A random lookup code for a pass; not a credential (ADR 1). */
export function newShortCode(): string {
  // 256 is a multiple of 32, so taking each byte mod 32 is unbiased.
  const bytes = crypto.getRandomValues(new Uint8Array(SHORT_CODE_LENGTH));
  return Array.from(bytes, (b) => SHORT_CODE_ALPHABET[b % 32]).join("");
}

/** What a guard typed, tidied for lookup: case, spaces and dashes ignored. Null if it cannot be a code. */
export function normaliseShortCode(typed: string): string | null {
  const code = typed.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== SHORT_CODE_LENGTH) return null;
  for (const ch of code) if (!SHORT_CODE_ALPHABET.includes(ch)) return null;
  return code;
}

/** Shown as ABCD-EFGH so it is easy to read out. */
export function formatShortCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
