# Salama Pass: Threat Model

Status: Draft 1 · Owner: Ruby Mbete · Last updated: 2026-11-10

## 1. What we protect

1. **Who can enter the estate.** A wrongly admitted visitor is the worst outcome.
2. **The visitor log.** It must be accurate, complete and unaltered.
3. **Personal data.** Visitor names and phones, and resident names, units and phones.
4. **The signing key.** Anyone who holds it can mint valid passes.

## 2. Who we defend against

| Actor | Goal |
| --- | --- |
| Outsider with no pass | Get in. |
| Visitor with a real pass | Reuse it, share it, or use it after it expires. |
| Dishonest guard | Admit a friend without a record, or delete a record. |
| Curious resident | See other units' visitors. |
| Attacker on the network | Read or change traffic, or replay requests. |
| Thief with a guard's phone | Use or read the app and its local data. |

## 3. Trust boundaries

- The **server** is trusted. It holds the signing key and decides who has which role.
- The **guard device** is semi-trusted. It verifies passes, but it can be lost or stolen and it can be offline.
- **Residents' phones** and **visitors' phones** are untrusted. They hold a pass but cannot change what it says.

## 4. Threats and mitigations

| # | Threat | Mitigation |
| --- | --- | --- |
| 1 | Forged pass | Passes are signed with a key only the server holds. The device holds only the public key and rejects a bad signature. |
| 2 | Pass used after it expires | The window is inside the signed token and the device checks it. Lifetimes are short (§5 of requirements). |
| 3 | Pass reused or shared | A use limit is in the token. The device counts uses it has seen, and the server counts them on sync. Two offline devices could both accept one single-use pass; this is accepted and detected on reconciliation (see ADR on offline). |
| 4 | Cancelled pass still accepted offline | The device holds a revocation list refreshed when online. A device offline for a long time may miss a cancellation; short pass lifetimes limit the exposure. |
| 5 | Guard admits someone with no record | Every admit is an event with a device id and guard id. An unexplained gap is visible in the log. This reduces the risk but cannot stop a guard physically opening the gate. |
| 6 | Log altered or entries deleted | The audit log is append-only and hash-chained. Admins have no delete path. Altering a record breaks the chain from that point. |
| 7 | Resident reads another unit's visitors | Every query is scoped by the caller's role and units on the server, and tested. |
| 8 | Guard or resident acts after leaving | An admin can deactivate a person at once. Sessions are short-lived and checked against the active flag. |
| 9 | Stolen or shared guard phone | A PIN or per-guard sign-in is required. Local data is the minimum needed and is cleared on sign-out. A remote deactivation stops sync. |
| 10 | Replay of an upload | Events have a client-generated unique id, and the server ignores a repeat. |
| 11 | Tampered upload from a device | The server checks the device's session, the guard's role, and that referenced passes exist and belong to that estate. |
| 12 | Clock set wrongly on the device | Expiry checks allow a small tolerance. The device time is stored with each event, beside the server's receipt time, so large drift is visible. |
| 13 | Signing key leaked | The key is kept outside the repo and the database, rotated on a schedule, and the token carries a key id so an old key can be retired. |
| 14 | Personal data kept too long or exposed | Retention limits, field minimisation, and role-scoped access (requirements §8). No ID numbers are collected. |
| 15 | Brute-forcing short codes | Short codes are only an input for a signed pass, not a secret on their own, and attempts are rate limited per device. |

## 5. Known gaps, accepted for v1

- A guard who opens the gate without using the app cannot be detected by the app.
- Offline revocation is eventually consistent, not instant.
- Two offline devices can both accept a single-use pass before they sync.
- There is no protection against someone tailgating a vehicle through an open gate.

## 6. To revisit before any real deployment

- A review of the Data Protection Act, 2019 obligations: lawful basis, retention, notices to visitors, and registration requirements.
- A penetration test, or at least a structured review of the API and the offline sync.
- Backup, recovery and key-rotation procedures.
