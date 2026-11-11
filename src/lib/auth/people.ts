import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Db } from "@/db/types";
import type { Actor } from "../access/permissions";

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** A signed-in person: what `can()` needs, plus what the screens show. */
export type SignedIn = Actor & {
  name: string;
  email: string;
  phone: string | null;
  estateName: string;
  unitLabels: string[];
};

/** Only an active person an admin has added may be sent a sign-in code (ADR 2: no public sign-up). */
export async function mayReceiveCode(db: Db, email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.person.id })
    .from(schema.person)
    .where(
      and(
        eq(schema.person.email, normaliseEmail(email)),
        eq(schema.person.active, true),
      ),
    )
    .limit(1);
  return row !== undefined;
}

/**
 * The person behind a Better Auth user, or null if there is none or they are deactivated.
 * The first sign-in links the user to the person with the same email; later ones follow the link.
 */
export async function personForUser(
  db: Db,
  user: { id: string; email: string },
): Promise<SignedIn | null> {
  let [row] = await db
    .select()
    .from(schema.person)
    .where(eq(schema.person.userId, user.id))
    .limit(1);

  if (!row) {
    [row] = await db
      .update(schema.person)
      .set({ userId: user.id })
      .where(
        and(
          eq(schema.person.email, normaliseEmail(user.email)),
          isNull(schema.person.userId),
        ),
      )
      .returning();
  }
  if (!row || !row.active || !row.email) return null;

  const [[estate], units] = await Promise.all([
    db
      .select({ name: schema.estate.name })
      .from(schema.estate)
      .where(eq(schema.estate.id, row.estateId)),
    db
      .select({ id: schema.unit.id, label: schema.unit.label })
      .from(schema.residency)
      .innerJoin(schema.unit, eq(schema.residency.unitId, schema.unit.id))
      .where(eq(schema.residency.personId, row.id))
      .orderBy(schema.unit.label),
  ]);

  return {
    personId: row.id,
    estateId: row.estateId,
    role: row.role,
    active: row.active,
    unitIds: units.map((u) => u.id),
    unitLabels: units.map((u) => u.label),
    name: row.name,
    email: row.email,
    phone: row.phone,
    estateName: estate?.name ?? "",
  };
}

/** What a person may change about themselves; role, estate and email stay with the admin. */
export async function updateOwnProfile(
  db: Db,
  personId: string,
  change: { name: string; phone: string | null },
): Promise<void> {
  await db
    .update(schema.person)
    .set(change)
    .where(eq(schema.person.id, personId));
}

/** Checks a profile form; returns the cleaned values or a message for each bad field. */
export function parseProfile(form: {
  name: unknown;
  phone: unknown;
}):
  | { ok: true; name: string; phone: string | null }
  | { ok: false; errors: { name?: string; phone?: string } } {
  const name = typeof form.name === "string" ? form.name.trim() : "";
  const rawPhone = typeof form.phone === "string" ? form.phone.trim() : "";
  const phone = rawPhone.replace(/[\s-]/g, "");
  const errors: { name?: string; phone?: string } = {};
  if (name.length < 2) errors.name = "Enter your name.";
  else if (name.length > 80)
    errors.name = "Keep your name under 80 characters.";
  if (phone && !/^\+?\d{9,15}$/.test(phone))
    errors.phone =
      "Enter a phone number like 0712 345 678 or +254 712 345 678.";
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, name, phone: phone || null };
}
