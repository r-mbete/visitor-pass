import { existsSync } from "node:fs";
import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";

// Node gives each address 250 ms by default, less than one round trip to us-east-1 from far away.
setDefaultAutoSelectFamilyAttemptTimeout(1000);

// Next loads .env.local itself; scripts and drizzle-kit need it loaded here.
if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

/** The Postgres connection string; `direct` prefers the unpooled one that migrations and transactions need. */
export function databaseUrl({ direct = false } = {}): string {
  const url =
    (direct && process.env.DATABASE_URL_UNPOOLED) || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  // Neon issues sslmode=require, which pg already treats as verify-full and warns about.
  return url.replace("sslmode=require", "sslmode=verify-full");
}
