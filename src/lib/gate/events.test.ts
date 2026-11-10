import { describe, expect, it } from "vitest";
import { MAX_EVENTS_PER_UPLOAD, parseUpload } from "./events";

const id = () => crypto.randomUUID();
const entry = (over: Record<string, unknown> = {}) => ({
  id: id(),
  passId: id(),
  unitId: null,
  visitorName: "Amina Otieno",
  kind: "entry",
  reason: null,
  deviceId: "gate-phone-1",
  deviceTime: "2026-11-10T08:00:00.000Z",
  ...over,
});

describe("reading an upload from a gate device", () => {
  it("accepts well-formed events", () => {
    const upload = parseUpload({
      events: [
        entry(),
        entry({ kind: "refusal", reason: "expired" }),
        entry({ kind: "exit" }),
      ],
    });
    expect(upload).toMatchObject({ errors: [] });
    expect(typeof upload !== "string" && upload.events).toHaveLength(3);
  });

  it("refuses a body that is not an upload", () => {
    expect(parseUpload(null)).toBe("body must be an object");
    expect(parseUpload({ events: "x" })).toBe("events must be a list");
    expect(
      parseUpload({ events: Array(MAX_EVENTS_PER_UPLOAD + 1).fill(entry()) }),
    ).toMatch(/at most/);
  });

  it.each([
    ["an id that is not a uuid", { id: "1" }, "id must be a uuid"],
    ["an unknown kind", { kind: "visit" }, "kind must be"],
    ["a refusal without a reason", { kind: "refusal" }, "needs a known reason"],
    [
      "a refusal with a made-up reason",
      { kind: "refusal", reason: "rude" },
      "needs a known reason",
    ],
    ["an entry with a reason", { reason: "expired" }, "only a refusal"],
    ["an entry with no pass", { passId: null }, "must name its pass"],
    ["no device id", { deviceId: " " }, "deviceId is required"],
    ["a bad device time", { deviceTime: "yesterday" }, "deviceTime must be"],
    ["an over-long name", { visitorName: "x".repeat(81) }, "visitorName"],
  ])("rejects %s, without rejecting the rest", (_, over, error) => {
    const upload = parseUpload({ events: [entry(), entry(over)] });
    expect(upload).toMatchObject({
      events: [expect.anything()],
      errors: [{ index: 1, error: expect.stringContaining(error) }],
    });
  });

  it("allows a refusal with no pass, such as an unreadable code", () => {
    const upload = parseUpload({
      events: [entry({ kind: "refusal", reason: "unreadable", passId: null })],
    });
    expect(upload).toMatchObject({ errors: [] });
  });
});
