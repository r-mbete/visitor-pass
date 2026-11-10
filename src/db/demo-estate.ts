import { eq } from "drizzle-orm";
import * as schema from "./schema";
import type { Db } from "./types";

/** A fixed, recognisable id per demo row, so a rerun replaces the same rows. */
const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

export const DEMO_ESTATE_ID = id(1);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const UNITS = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"] as const;
type UnitLabel = (typeof UNITS)[number];
const unitId = (label: UnitLabel) => id(100 + UNITS.indexOf(label));

const PEOPLE = {
  admin: { id: id(200), name: "Grace Mutua", role: "admin" },
  juma: { id: id(201), name: "Juma Hassan", role: "guard" },
  peter: { id: id(202), name: "Peter Kiprono", role: "guard" },
  wanjiru: { id: id(210), name: "Wanjiru Kamau", role: "resident", unit: "A1" },
  otieno: { id: id(211), name: "Otieno Ochieng", role: "resident", unit: "A2" },
  fatma: { id: id(212), name: "Fatma Ali", role: "resident", unit: "A3" },
  daniel: { id: id(213), name: "Daniel Mwangi", role: "resident", unit: "B1" },
  achieng: {
    id: id(214),
    name: "Achieng Odhiambo",
    role: "resident",
    unit: "B2",
  },
  // Moved out: kept so the admin screens have a deactivated person to show.
  samuel: {
    id: id(215),
    name: "Samuel Njoroge",
    role: "resident",
    unit: "B4",
    active: false,
  },
} as const satisfies Record<
  string,
  {
    id: string;
    name: string;
    role: "admin" | "guard" | "resident";
    unit?: UnitLabel;
    active?: boolean;
  }
>;

/** Rebuilds the demo estate around `now`, so its passes are always for today. Other estates are untouched. */
export async function seedDemoEstate(db: Db, now = new Date()) {
  // Whole minutes, so the passes read cleanly on screen.
  const t = (offset: number) =>
    new Date(Math.floor(now.getTime() / MINUTE) * MINUTE + offset);

  const passes: (typeof schema.pass.$inferInsert)[] = [
    // Ready to admit now: the first thing to try at the gate.
    {
      id: id(300),
      unit: "A1",
      by: PEOPLE.wanjiru.id,
      code: "GATE2345",
      visitor: "Amina Otieno",
      from: -HOUR,
      until: 3 * HOUR,
      uses: 1,
    },
    // Not yet valid: arrives this afternoon.
    {
      id: id(301),
      unit: "A2",
      by: PEOPLE.otieno.id,
      code: "SALAMA22",
      visitor: "Brian Kariuki",
      from: 2 * HOUR,
      until: 6 * HOUR,
      uses: 1,
    },
    // A regular visitor with several entries, one already used.
    {
      id: id(302),
      unit: "B1",
      by: PEOPLE.daniel.id,
      code: "MVULE234",
      visitor: "Mary Wambui",
      from: -2 * HOUR,
      until: 8 * HOUR,
      uses: 4,
    },
    // Cancelled by the resident.
    {
      id: id(303),
      unit: "A3",
      by: PEOPLE.fatma.id,
      code: "PASS2345",
      visitor: "Kevin Mutiso",
      from: -HOUR,
      until: 5 * HOUR,
      uses: 1,
      cancelled: true,
    },
    // Expired this morning.
    {
      id: id(304),
      unit: "B2",
      by: PEOPLE.achieng.id,
      code: "NYUMBA23",
      visitor: "Halima Yusuf",
      from: -10 * HOUR,
      until: -2 * HOUR,
      uses: 1,
    },
    // Single use, already used.
    {
      id: id(305),
      unit: "A2",
      by: PEOPLE.otieno.id,
      code: "BARAZA27",
      visitor: "Tom Barasa",
      from: -3 * HOUR,
      until: HOUR,
      uses: 1,
    },
  ].map((p) => ({
    id: p.id,
    estateId: DEMO_ESTATE_ID,
    unitId: unitId(p.unit as UnitLabel),
    createdBy: p.by,
    shortCode: p.code,
    visitorName: p.visitor,
    validFrom: t(p.from),
    validUntil: t(p.until),
    maxUses: p.uses,
    status: "cancelled" in p ? ("cancelled" as const) : ("active" as const),
  }));

  const event = (
    n: number,
    passIndex: number,
    kind: "entry" | "exit" | "refusal",
    offset: number,
    guardId: string,
    reason?: (typeof schema.entryEvent.$inferInsert)["reason"],
  ): typeof schema.entryEvent.$inferInsert => {
    const p = passes[passIndex]!;
    return {
      id: id(400 + n),
      estateId: DEMO_ESTATE_ID,
      passId: p.id,
      unitId: p.unitId,
      visitorName: p.visitorName,
      guardId,
      deviceId: "demo-gate-phone",
      kind,
      reason: reason ?? null,
      deviceTime: t(offset),
    };
  };

  const events = [
    event(0, 2, "entry", -90 * MINUTE, PEOPLE.juma.id),
    event(1, 2, "exit", -30 * MINUTE, PEOPLE.juma.id),
    event(2, 4, "entry", -9 * HOUR, PEOPLE.peter.id),
    event(3, 4, "exit", -6 * HOUR, PEOPLE.peter.id),
    event(4, 4, "refusal", -HOUR, PEOPLE.juma.id, "expired"),
    event(5, 5, "entry", -2 * HOUR, PEOPLE.juma.id),
  ];

  await db.transaction(async (tx) => {
    // Children first, so foreign keys never block the rebuild.
    await tx
      .delete(schema.entryEvent)
      .where(eq(schema.entryEvent.estateId, DEMO_ESTATE_ID));
    await tx
      .delete(schema.pass)
      .where(eq(schema.pass.estateId, DEMO_ESTATE_ID));
    await tx
      .delete(schema.person)
      .where(eq(schema.person.estateId, DEMO_ESTATE_ID)); // residencies cascade
    await tx
      .delete(schema.unit)
      .where(eq(schema.unit.estateId, DEMO_ESTATE_ID));
    await tx.delete(schema.estate).where(eq(schema.estate.id, DEMO_ESTATE_ID));

    await tx
      .insert(schema.estate)
      .values({ id: DEMO_ESTATE_ID, name: "Mvule Gardens (demo)" });
    await tx.insert(schema.unit).values(
      UNITS.map((label) => ({
        id: unitId(label),
        estateId: DEMO_ESTATE_ID,
        label,
      })),
    );
    const people = Object.values(PEOPLE);
    await tx.insert(schema.person).values(
      people.map((p) => ({
        id: p.id,
        estateId: DEMO_ESTATE_ID,
        name: p.name,
        role: p.role,
        active: !("active" in p) || p.active,
      })),
    );
    await tx
      .insert(schema.residency)
      .values(
        people.flatMap((p) =>
          "unit" in p ? [{ personId: p.id, unitId: unitId(p.unit) }] : [],
        ),
      );
    await tx.insert(schema.pass).values(passes);
    await tx.insert(schema.entryEvent).values(events);
  });

  return {
    units: UNITS.length,
    people: Object.keys(PEOPLE).length,
    passes: passes.length,
    events: events.length,
  };
}
