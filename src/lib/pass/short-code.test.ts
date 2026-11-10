import { describe, expect, it } from "vitest";
import {
  formatShortCode,
  newShortCode,
  normaliseShortCode,
  SHORT_CODE_ALPHABET,
} from "./short-code";

describe("short codes", () => {
  it("are 8 characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = newShortCode();
      expect(code).toHaveLength(8);
      for (const ch of code) expect(SHORT_CODE_ALPHABET).toContain(ch);
    }
  });

  it("leave out characters that are easy to misread", () => {
    for (const ch of "IO01") expect(SHORT_CODE_ALPHABET).not.toContain(ch);
    expect(new Set(SHORT_CODE_ALPHABET).size).toBe(32);
  });

  it("accept what a guard types, in any case, with spaces or a dash", () => {
    expect(normaliseShortCode("abcd-efgh")).toBe("ABCDEFGH");
    expect(normaliseShortCode(" AB CD EF GH ")).toBe("ABCDEFGH");
  });

  it("reject input that cannot be a code", () => {
    expect(normaliseShortCode("ABCDEFG")).toBeNull();
    expect(normaliseShortCode("ABCDEFGO")).toBeNull();
    expect(normaliseShortCode("")).toBeNull();
  });

  it("are shown in two halves", () => {
    expect(formatShortCode("ABCDEFGH")).toBe("ABCD-EFGH");
  });
});
