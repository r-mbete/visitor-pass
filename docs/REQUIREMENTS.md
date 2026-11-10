# Salama Pass: v1 Requirements

Status: Draft 1 · Owner: Ruby Mbete · Last updated: 2026-11-10

## 1. Overview

Salama Pass ("salama" is Swahili for safe) is a visitor management system for gated estates. Many estates still use a paper logbook at the gate. That is slow, hard to search, easy to falsify, and records personal details anyone can read.

Salama Pass replaces the logbook. A resident pre-approves a visitor and the visitor gets a short-lived pass. The guard at the gate checks the pass, even with no network, and logs the entry. Every entry is kept in a tamper-evident audit log.

It is a portfolio piece. It should show careful engineering of access rules, offline behaviour and personal-data handling in a small, finished product.

## 2. Goals and non-goals

**Goals**

- A guard can admit or refuse a visitor in seconds, on a phone, with no signal.
- A resident controls who can visit their unit and can see who came.
- An estate admin can see an accurate history of every entry.
- A forged, expired or reused pass is refused.
- Personal data is kept to the minimum needed and deleted on a schedule.
- Rules, offline sync and permissions are covered by tests, and the main decisions are written down as ADRs.

**Non-goals for v1**

- Number-plate recognition, face recognition or any biometric.
- Boom-gate or door hardware integration.
- Payments, billing or service charges.
- Multi-estate management by a single operator (v1 is one estate).
- Native mobile apps. v1 is a web app that installs as a PWA.

## 3. Users

| Role | Need |
| --- | --- |
| **Guard** (primary) | Check a visitor in or out quickly, offline, without confusing screens. |
| **Resident** | Pre-approve visitors, approve walk-ins, and see who has come. |
| **Estate admin** | Manage units, residents and guards, and review the log. |
| **Reviewer** (portfolio) | See that the access rules are correct and the code is sound. |

## 4. User stories

1. As a resident, I can pre-register a visitor for a date range so they can be admitted without a phone call.
2. As a visitor, I receive a pass (a QR code and a short code) that works only for my visit.
3. As a guard, I can scan or type a pass and see at once whether to admit, with the visitor and unit shown.
4. As a guard, I can log a walk-in, ask the resident to approve, and admit only on approval.
5. As a guard, I can keep working with no connection, and what I record is uploaded when the connection returns.
6. As a resident, I am notified when a visitor arrives and can approve or refuse a walk-in.
7. As a resident, I can cancel a pass before it is used.
8. As an admin, I can add or remove units, residents and guards, and see the entry log.
9. As an admin, I can see that a log entry has not been altered after the fact.

## 5. Functional requirements (v1)

### Passes (stories 1, 2, 7)

- A resident creates a pass for one visitor: name, optional phone, valid-from and valid-until, and a use limit (default one entry).
- The pass is a signed token. It carries a pass id, the unit, the window and the use limit, and is signed by the server (see ADR on the signed pass).
- The pass is shown as a QR code and as a short code of at most 8 characters for typing.
- A pass can be cancelled until it is used up.
- Passes are short-lived. The maximum validity is 24 hours unless an admin allows longer for a recurring visitor.

### Gate check (stories 3, 4, 5)

- The guard scans a QR code or types the short code.
- The app verifies the signature, the window and the use limit locally, then shows ADMIT or REFUSE with the reason.
- Refusal reasons are specific: not yet valid, expired, cancelled, already used, wrong estate, unreadable.
- The guard confirms the entry, and an entry event is stored on the device with a unique id.
- A walk-in is logged with the visitor's name and the unit. The resident is asked to approve. If the guard is offline or the resident does not respond, the walk-in is refused by default.
- Check-out is optional and recorded the same way.

### Offline and sync (story 5)

- The guard app is a PWA. The app shell loads with no connection.
- While online, the device holds the estate's public key, today's active passes and the current revocation list.
- Entry events queue on the device and upload when a connection returns. Uploads are idempotent on the event id.
- The app shows clearly whether it is online, and how many events are waiting to upload.

### Notifications (story 6)

- A resident is notified on arrival (push notification, with SMS as a fallback to be decided).
- A walk-in approval request reaches the resident and the answer reaches the guard.

### Audit log (stories 8, 9)

- Every entry, refusal, pass creation, cancellation and admin change is appended to the log.
- The log is append-only. Each record includes a hash of the previous record, so an alteration is detectable.
- An admin can list and filter the log by date, unit, guard and outcome.

### Administration (story 8)

- An admin manages units, residents and guards, and can deactivate a guard immediately.
- Sign-in is required for residents, guards and admins. Roles decide what each can see and do.

## 6. Data model (outline)

```
estate        id, name, signing key reference, settings
unit          id, estate_id, label
person        id, estate_id, name, phone, role ('resident'|'guard'|'admin'), active
residency     person_id, unit_id
pass          id, estate_id, unit_id, created_by, short_code, visitor_name, visitor_phone,
              valid_from, valid_until, max_uses, status, created_at
entry_event   id (client-generated, idempotency key), pass_id nullable, estate_id,
              unit_id, visitor_name, guard_id, device_id, kind ('entry'|'exit'|'refusal'),
              reason, device_time, received_at
audit_record  id, estate_id, seq, event_type, payload, prev_hash, hash, at
```

Visitor name and phone are the only personal data about visitors. No ID numbers are stored in v1. Retention is set in §8.

## 7. Roles and permissions

| Action | Resident | Guard | Admin |
| --- | --- | --- | --- |
| Create or cancel a pass for own unit | ✓ | | ✓ |
| Verify a pass and record an entry | | ✓ | |
| Approve a walk-in for own unit | ✓ | | |
| See the entry log for own unit | ✓ | | ✓ (all) |
| See today's expected visitors at the gate | | ✓ | ✓ |
| Manage units, residents and guards | | | ✓ |
| Read the audit log | | | ✓ |

## 8. Privacy and data protection

- Collect only a visitor's name and, optionally, a phone number.
- Residents see only their own unit's visitors. Guards see only what the gate needs for today.
- Visitor details are deleted after a retention period (default 90 days). Audit records keep a hash and the event type but drop personal fields after that period.
- Kenya's Data Protection Act, 2019 applies to the personal data this system holds. v1 will record the lawful basis, the retention period and who can access what. This is a design aim, not legal advice, and it needs checking against the Act and the Data Protection Commissioner's guidance before any real deployment.

## 9. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Gate speed | A scan to ADMIT or REFUSE in under 1 second on a mid-range phone, offline. |
| Offline | Full gate check works with no connection; sync catches up on reconnect with no duplicates. |
| Security | Threat model in `THREAT-MODEL.md`; no secrets in the repo; the signing private key never leaves the server. |
| Accessibility | WCAG 2.2 AA. Large touch targets and high contrast for the guard screen, used outdoors. |
| Reliability | Entry events are never lost. An upload failure keeps them queued. |
| Quality | Unit tests for the pass rules, permissions and sync. Playwright smoke tests for the gate flow. CI runs lint, types, tests and build. |

## 10. Tech stack (proposed)

- Next.js (App Router), TypeScript strict, Tailwind.
- PostgreSQL (Neon) with Drizzle ORM and drizzle-kit.
- Vitest, with PGlite for database tests, and Playwright for browser tests.
- PWA: web manifest and a service worker, IndexedDB for local data.
- Authentication: a library with role support, chosen in an ADR.
- Hosting: Vercel.

## 11. First ADRs to write

1. Authentication and roles.
2. The signed-pass format and the signing algorithm.
3. Offline strategy: what is cached, how events queue, how conflicts are handled.
4. The tamper-evident audit log.
5. Notifications: push, SMS or both.

## 12. Milestones

| # | Milestone | Done when |
| --- | --- | --- |
| M0 | Scaffold | New repo, CI green, deployed. |
| M1 | Rules | Pass signing and verification, and the permission rules, are implemented and tested with no UI. |
| M2 | Data | Schema, migrations and seed for one estate. |
| M3 | Gate | Guard flow works online: scan, verify, record. |
| M4 | Offline | Guard flow works with no connection and syncs on reconnect. |
| M5 | Residents and admin | Pass creation, notifications, log view. |
| M6 | Polish | Accessibility pass, threat model reviewed, README and case study. |

## 13. Open questions

- SMS or push first for notifications? SMS reaches everyone but costs money per message.
- Should a resident be able to issue a recurring pass (for a house help or a regular delivery)?
- Does the guard device need a PIN or a per-guard login, given that devices can be shared?
- Which authentication library fits roles, sessions and an installed PWA best?
