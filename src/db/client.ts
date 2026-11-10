import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseUrl } from "./env";
import * as schema from "./schema";
import type { Db } from "./types";

// Reused across hot reloads in dev and across invocations of a warm serverless function.
const globalForDb = globalThis as unknown as { salamaDb?: Db };

export function getDb(): Db {
  globalForDb.salamaDb ??= drizzle(
    new Pool({ connectionString: databaseUrl(), max: 3 }),
    {
      schema,
    },
  );
  return globalForDb.salamaDb;
}
