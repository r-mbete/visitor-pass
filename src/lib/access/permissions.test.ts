import { describe, expect, it } from "vitest";
import { type Action, type Actor, can } from "./permissions";

const E = "estate-1";
const resident: Actor = {
  personId: "p-res",
  estateId: E,
  role: "resident",
  unitIds: ["unit-b4"],
  active: true,
};
const guard: Actor = {
  ...resident,
  personId: "p-grd",
  role: "guard",
  unitIds: [],
};
const admin: Actor = {
  ...resident,
  personId: "p-adm",
  role: "admin",
  unitIds: [],
};

const own = "unit-b4";
const other = "unit-c1";

// One row per line of the table in docs/REQUIREMENTS.md §7: [action, resident, guard, admin].
// prettier-ignore
const table: [string, Action, boolean, boolean, boolean][] = [
  ["create a pass for own unit",         { do: "pass.create", estateId: E, unitId: own },      true,  false, true ],
  ["create a pass for another unit",     { do: "pass.create", estateId: E, unitId: other },    false, false, true ],
  ["cancel a pass for own unit",         { do: "pass.cancel", estateId: E, unitId: own },      true,  false, true ],
  ["cancel a pass for another unit",     { do: "pass.cancel", estateId: E, unitId: other },    false, false, true ],
  ["verify a pass",                      { do: "gate.verify", estateId: E },                   false, true,  false],
  ["record an entry",                    { do: "entry.record", estateId: E },                  false, true,  false],
  ["approve a walk-in for own unit",     { do: "walkin.approve", estateId: E, unitId: own },   true,  false, false],
  ["approve a walk-in for another unit", { do: "walkin.approve", estateId: E, unitId: other }, false, false, false],
  ["read own unit's log",                { do: "log.read", estateId: E, unitId: own },         true,  false, true ],
  ["read another unit's log",            { do: "log.read", estateId: E, unitId: other },       false, false, true ],
  ["read the whole estate's log",        { do: "log.read", estateId: E },                      false, false, true ],
  ["see today's expected visitors",      { do: "gate.expected", estateId: E },                 false, true,  true ],
  ["manage people",                      { do: "people.manage", estateId: E },                 false, false, true ],
  ["read the audit log",                 { do: "audit.read", estateId: E },                    false, false, true ],
];

describe("the permission table", () => {
  it.each(table)("%s", (_, action, forResident, forGuard, forAdmin) => {
    expect(can(resident, action)).toBe(forResident);
    expect(can(guard, action)).toBe(forGuard);
    expect(can(admin, action)).toBe(forAdmin);
  });
});

describe("rules that apply to every action", () => {
  it.each(table)("a deactivated person cannot %s", (_, action) => {
    for (const actor of [resident, guard, admin])
      expect(can({ ...actor, active: false }, action)).toBe(false);
  });

  it.each(table)("nobody from another estate can %s", (_, action) => {
    const elsewhere = { ...action, estateId: "estate-2" } as Action;
    for (const actor of [resident, guard, admin])
      expect(can(actor, elsewhere)).toBe(false);
  });
});
