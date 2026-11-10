import "server-only";
import { and, eq } from "drizzle-orm";
import { DEMO_ESTATE_ID } from "@/db/demo-estate";
import * as schema from "@/db/schema";
import type { Db } from "@/db/types";
import type { Actor } from "../access/permissions";

/** The demo gate is open locally, or where DEMO_GATE=on is set, until guard sign-in exists (ADR 2, milestone 4). */
export function demoGateEnabled(env = process.env): boolean {
  return env.NODE_ENV !== "production" || env.DEMO_GATE === "on";
}

/** Stands in for a signed-in guard: the demo estate's first active guard by name. */
export async function demoGuard(
  db: Db,
): Promise<(Actor & { name: string }) | null> {
  const [guard] = await db
    .select()
    .from(schema.person)
    .where(
      and(
        eq(schema.person.estateId, DEMO_ESTATE_ID),
        eq(schema.person.role, "guard"),
        eq(schema.person.active, true),
      ),
    )
    .orderBy(schema.person.name)
    .limit(1);
  if (!guard) return null;
  return {
    personId: guard.id,
    estateId: guard.estateId,
    role: guard.role,
    unitIds: [],
    active: guard.active,
    name: guard.name,
  };
}
