export const ROLES = ["resident", "guard", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** The signed-in person, as the server knows them. */
export type Actor = {
  personId: string;
  estateId: string;
  role: Role;
  /** Units this person lives in; empty for guards and most admins. */
  unitIds: readonly string[];
  active: boolean;
};

/** Everything a person can try to do, with what it is done to. */
export type Action =
  | { do: "pass.create"; estateId: string; unitId: string }
  | { do: "pass.cancel"; estateId: string; unitId: string }
  | { do: "gate.verify"; estateId: string }
  | { do: "entry.record"; estateId: string }
  | { do: "gate.expected"; estateId: string }
  | { do: "walkin.approve"; estateId: string; unitId: string }
  | { do: "log.read"; estateId: string; unitId?: string }
  | { do: "people.manage"; estateId: string }
  | { do: "audit.read"; estateId: string };

/** The permission table in docs/REQUIREMENTS.md §7. Deny unless a rule allows. */
export function can(actor: Actor, action: Action): boolean {
  if (!actor.active || actor.estateId !== action.estateId) return false;
  const livesIn = (unitId: string | undefined) =>
    unitId !== undefined && actor.unitIds.includes(unitId);

  switch (action.do) {
    case "pass.create":
    case "pass.cancel":
      return (
        actor.role === "admin" ||
        (actor.role === "resident" && livesIn(action.unitId))
      );
    case "gate.verify":
    case "entry.record":
      return actor.role === "guard";
    case "gate.expected":
      return actor.role === "guard" || actor.role === "admin";
    case "walkin.approve":
      return actor.role === "resident" && livesIn(action.unitId);
    case "log.read":
      return (
        actor.role === "admin" ||
        (actor.role === "resident" && livesIn(action.unitId))
      );
    case "people.manage":
    case "audit.read":
      return actor.role === "admin";
  }
}
