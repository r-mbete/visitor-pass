# Salama Pass

Visitor management for gated estates. _Salama_ is Swahili for safe.

A resident pre-approves a visitor and the visitor gets a short-lived signed pass. The guard at the gate checks the pass on a phone, even with no signal, and logs the entry in a tamper-evident audit log. It replaces the paper logbook.

## Status

Milestones 1 to 3 of 6 are done: the pass rules, permissions, schema, a demo estate, and a gate screen that checks passes and records entries. Sign-in with an emailed code, sign-out and a profile page are also in, ahead of milestone 5. Offline mode comes next. See the milestones in the requirements.

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
openssl rand -base64 32      # paste it as BETTER_AUTH_SECRET in .env.local
npm run db:migrate
npm run db:seed              # a demo estate, Mvule Gardens
npm run dev                  # http://localhost:3000, then sign in
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

### Signing in

Everyone signs in at `/login` with a 6-digit code sent to their email (ADR 2). There is no password and no public sign-up: a code is only sent to an active person an admin has added. No email provider is chosen yet, so in development the code is printed in the terminal running `npm run dev`, and the sign-in page lists the demo accounts (one click fills in the email). Every demo person's email is `<first name>@mvule.example`, such as `juma@mvule.example` (guard), `grace@mvule.example` (admin) or `wanjiru@mvule.example` (resident, A1). In production, sign-in fails until a provider is set up.

Sessions are stored in Postgres and last a week from last use. Every page checks the person behind the session on each request, so deactivating someone locks them out at once.

### Pages

Each role sees only its own pages, following the permission table in the requirements:

| Page                                                                                                 | Resident | Guard | Admin                    |
| ---------------------------------------------------------------------------------------------------- | -------- | ----- | ------------------------ |
| **Dashboard** (`/dashboard`): the day's numbers, the hourly chart, who is expected and who is inside |          | ✓     | ✓ (plus recent activity) |
| **Gate** (`/gate`): type a code, see ADMIT or REFUSE with the reason, record it                      |          | ✓     |                          |
| **Passes** (`/passes`): passes around today, with QR code, short code and status                     | own unit | ✓     | ✓                        |
| **Log** (`/log`): entries, exits and refusals, newest first                                          | own unit |       | ✓                        |
| **Profile** (`/profile`): your details, phone, where you are signed in, sign out                     | ✓        | ✓     | ✓                        |

After signing in, a guard lands on the gate, an admin on the dashboard and a resident on their passes. The gate screen checks each pass in the browser with the estate's public key, which is how it will work offline.

## Design

The palette is Acacia teal: a deep teal sidebar, a mint-white page, white cards, a terracotta accent, and pastel mint, sky, sand and peach tiles for the day's numbers. Green means admit, red means refuse and marigold means "later today". Headings use Plus Jakarta Sans, text uses Inter and codes use IBM Plex Mono. Icons are Heroicons: outline in the menu, solid for the current page and for states. Every text colour pair is at least 4.5:1 (most are above 7:1), and a status is always shown in words, never by colour alone. In the hourly chart, refusals are also hatched so they don't depend on red against green. Desktops get a sidebar, tablets a top menu and phones a bottom tab bar. Layouts are checked at 390 px, tablet and desktop widths, with no sideways scrolling.

## Structure

```
docs/               requirements, threat model and ADRs
drizzle/            generated SQL migrations (never edit by hand)
src/
  app/              pages (/, /login, /dashboard, /gate, /passes, /log, /profile), the gate API (/api/gate/*) and Better Auth (/api/auth/*)
  components/       shared UI: the menu, page header, pass card, gate log, status labels
  db/               Drizzle schema, client, the demo estate seed and the in-memory test database
  lib/pass/         issuing and verifying signed passes, short codes, keys
  lib/access/       the role and permission rules, and which pages each role gets
  lib/auth/         sign-in: Better Auth setup, linking a user to their person, profile changes
  lib/gate/         the gate check, the device bundle, and recording what a device uploads
  scripts/          one-off scripts, such as generating a signing key
```

The tests need no database: the schema tests run the real migrations against an in-memory Postgres (PGlite). CI also applies the migrations to a throwaway Postgres to check they run cleanly.
