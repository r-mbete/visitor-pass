import { describe, expect, it } from "vitest";
import { homeFor, PAGE_ROLES, pageAllows } from "./pages";
import { type Actor, can, ROLES } from "./permissions";

const ESTATE = "estate-1";
const actor = (role: Actor["role"]): Actor => ({
  personId: "p",
  estateId: ESTATE,
  role,
  unitIds: ["u"],
  active: true,
});

describe("which pages each role gets", () => {
  it("opens the gate only to guards, as the permission rules do", () => {
    for (const role of ROLES)
      expect(pageAllows("/gate", role)).toBe(
        can(actor(role), { do: "gate.verify", estateId: ESTATE }),
      );
  });

  it("opens the log to residents and admins but not guards", () => {
    for (const role of ROLES)
      expect(pageAllows("/log", role)).toBe(
        can(actor(role), { do: "log.read", estateId: ESTATE, unitId: "u" }),
      );
  });

  it("opens the dashboard to whoever may see today's expected visitors", () => {
    for (const role of ROLES)
      expect(pageAllows("/dashboard", role)).toBe(
        can(actor(role), { do: "gate.expected", estateId: ESTATE }),
      );
  });

  it("sends everyone home to a page they are allowed on", () => {
    for (const role of ROLES)
      expect(pageAllows(homeFor(role), role)).toBe(true);
  });

  it("gives everyone a profile", () => {
    expect([...PAGE_ROLES["/profile"]].sort()).toEqual([...ROLES].sort());
  });
});
