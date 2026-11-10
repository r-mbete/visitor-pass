import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { seedDemoEstate } from "./demo-estate";
import { databaseUrl } from "./env";
import * as schema from "./schema";

async function main() {
  const pool = new Pool({ connectionString: databaseUrl({ direct: true }) });
  try {
    const counts = await seedDemoEstate(drizzle(pool, { schema }));
    console.log(
      `Demo estate rebuilt: ${counts.units} units, ${counts.people} people, ${counts.passes} passes, ${counts.events} gate events.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
