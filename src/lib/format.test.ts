import { describe, expect, it } from "vitest";
import { endOfDay, formatDay, formatTime, startOfDay } from "./format";

describe("Nairobi dates", () => {
  it("start the day at Nairobi midnight, not UTC midnight", () => {
    // 22:30 UTC on the 9th is 01:30 on the 10th in Nairobi.
    const now = new Date("2026-11-09T22:30:00Z");
    expect(startOfDay(now).toISOString()).toBe("2026-11-09T21:00:00.000Z");
    expect(endOfDay(now).toISOString()).toBe("2026-11-10T21:00:00.000Z");
  });

  it("show times and days in Nairobi time", () => {
    const now = new Date("2026-11-10T06:05:00Z");
    expect(formatTime(now)).toBe("09:05");
    expect(formatDay(now)).toBe("Tuesday 10 November");
  });
});
