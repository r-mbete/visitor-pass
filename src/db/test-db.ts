import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import type { Db } from "./types";

/** An in-memory Postgres with the real migrations applied, for tests. */
export async function createTestDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

export async function resetTestDb(db: Db): Promise<void> {
  await db.execute(
    sql`TRUNCATE estate, unit, person, residency, pass, entry_event CASCADE`,
  );
}
