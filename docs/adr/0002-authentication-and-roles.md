# 2. Authentication with Better Auth; roles stay in our own tables

Date: 2026-11-10

Status: Accepted

## Context

Residents, guards and admins must sign in (requirements §5), and what each may do is decided by the permission rules in `src/lib/access/permissions.ts`. The threat model asks for three things from sign-in:

- A deactivated person loses access at once (threat model #8).
- A stolen or shared gate phone cannot be used by just anyone (#9).
- No password database to leak, if we can avoid it.

The users differ. Residents and admins use their own phones, rarely, and want a quick sign-in. Guards share one phone at the gate, change shifts, and often have no signal.

## Decision

**Library.** Use Better Auth (1.7) with its Drizzle adapter, storing sessions in Postgres. Database sessions, not stateless JWTs, so deactivating a person ends their sessions on the next request. Auth.js v5 is still in beta, and writing our own session handling is a risk this project does not need to take.

**Residents and admins** sign in with a **one-time code sent by email** (the `email-otp` plugin). There is no password to store. SMS codes are left for the notifications ADR, since SMS costs money per message.

**Guards** sign in on an **enrolled gate device**:

1. An admin enrols a phone as a gate device for the estate. The device gets its own long-lived credential, which an admin can revoke.
2. At the start of a shift, each guard unlocks the device with a personal **6-digit PIN**. Every entry records both the device and the guard.
3. How the PIN is checked when the device is offline, and how many wrong tries lock it, is decided in ADR 3 (offline strategy).

**Roles stay ours.** Better Auth answers "who is this?". Our `person` table answers "what may they do?": `person` gets a `user_id` and an `email`, and the role, estate, units and `active` flag stay on `person`. We do not use Better Auth's admin-plugin roles, so there is one source of truth, and `can()` stays a pure, tested function.

**Who can sign in.** Only people an admin has added. A one-time code is sent only to an email address that belongs to an active `person`. There is no public sign-up.

## Alternatives considered

- **Auth.js v5.** Still in beta, and its database-session support with credentials is awkward.
- **Hosted auth (Clerk and similar).** Quick, but the user data lives with a third party, which adds a processor under the Data Protection Act, and it hides the part of the system a reviewer wants to see.
- **Passwords.** A database of password hashes to protect, and residents forget them.
- **One shared guard login per gate.** Simple, but then the log cannot say which guard admitted whom (threat model #5).

## Consequences

- Deactivation is immediate for online sessions. A gate device that is offline keeps working until it next syncs; ADR 3 covers that gap.
- Email delivery becomes a dependency for residents and admins. A provider is chosen when sign-in is built (milestone 5).
- Better Auth adds its own tables (`user`, `session`, `account`, `verification`) next to ours, generated as a Drizzle migration.
- Guards need no email address or phone of their own.
- Device enrolment and the guard PIN are our own code, so they need their own tests.
