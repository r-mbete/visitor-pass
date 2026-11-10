# Salama Pass

Visitor management for gated estates. _Salama_ is Swahili for safe.

A resident pre-approves a visitor and the visitor gets a short-lived signed pass. The guard at the gate checks the pass on a phone, even with no signal, and logs the entry in a tamper-evident audit log. It replaces the paper logbook.

## Status

Milestones 1 and 2 of 6 are done: the pass rules, permissions, schema and a demo estate are built and tested, with no UI yet. See the milestones in the requirements.

- [Requirements](docs/REQUIREMENTS.md): goals, users, stories, data model, milestones.
- [Threat model](docs/THREAT-MODEL.md): what is protected, who it is defended against, and the accepted gaps.
- [ADR 1: signed passes](docs/adr/0001-signed-pass-format.md): why a pass is an ES256-signed token the guard's phone can check offline.
- [ADR 2: authentication](docs/adr/0002-authentication-and-roles.md): Better Auth with email codes for residents, enrolled gate devices and PINs for guards.

## What it will show

- Access rules that are correct and tested: signed passes, expiry, use limits and revocation.
- A guard app that works offline as a PWA and syncs without duplicates.
- Role-based permissions for residents, guards and admins.
- Personal data kept to the minimum, with retention limits.
- Decisions recorded as ADRs in `docs/adr/`.

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS v4 · ESLint + Prettier · Vitest · GitHub Actions. PostgreSQL on Neon with Drizzle ORM. Passes are signed and verified with `jose`.

## Setup

Requires Node 24.21.0 (pinned in `.nvmrc`, so local and CI use the same npm). With nvm: `nvm use`.

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL
npm run keys:generate        # paste the PASS_SIGNING_KEY line into .env.local
npm run db:migrate
npm run db:seed              # a demo estate, Mvule Gardens
npm run dev                  # http://localhost:3000
```

## Scripts

| Script                  | What it does                                                |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | Start the dev server                                        |
| `npm run build`         | Production build                                            |
| `npm run lint`          | ESLint                                                      |
| `npm run format`        | Format with Prettier                                        |
| `npm run format:check`  | Check formatting                                            |
| `npm run typecheck`     | Generate Next route types, then `tsc --noEmit`              |
| `npm test`              | Run Vitest once                                             |
| `npm run db:generate`   | Write a migration after changing `src/db/schema.ts`         |
| `npm run db:migrate`    | Apply migrations to the database in `DATABASE_URL`          |
| `npm run db:seed`       | Rebuild the demo estate around today's date (safe to rerun) |
| `npm run db:studio`     | Browse the database in Drizzle Studio                       |
| `npm run keys:generate` | Print a new pass-signing key for `.env.local`               |

CI runs lint, format check, typecheck, tests and build on every PR and on pushes to `main`.

## Demo estate

`npm run db:seed` builds Mvule Gardens, a made-up estate with 8 units, an admin, 2 guards and 6 residents (one moved out). Its passes are dated around today, and each short code shows a different case at the gate:

| Code      | Visitor       | At the gate                 |
| --------- | ------------- | --------------------------- |
| GATE-2345 | Amina Otieno  | Admit                       |
| MVUL-E234 | Mary Wambui   | Admit (1 of 4 entries used) |
| SALA-MA22 | Brian Kariuki | Refuse: not yet valid       |
| PASS-2345 | Kevin Mutiso  | Refuse: cancelled           |
| NYUM-BA23 | Halima Yusuf  | Refuse: expired             |
| BARA-ZA27 | Tom Barasa    | Refuse: already used        |

A test signs each demo pass and runs it through the real verifier, so this table stays true.

## Structure

```
docs/               requirements, threat model and ADRs
drizzle/            generated SQL migrations (never edit by hand)
src/
  app/              routes (a placeholder home page for now)
  db/               Drizzle schema, client, the demo estate seed and the in-memory test database
  lib/pass/         issuing and verifying signed passes, short codes, keys
  lib/access/       the role and permission rules
  scripts/          one-off scripts, such as generating a signing key
```

The tests need no database: the schema tests run the real migrations against an in-memory Postgres (PGlite). CI also applies the migrations to a throwaway Postgres to check they run cleanly.
