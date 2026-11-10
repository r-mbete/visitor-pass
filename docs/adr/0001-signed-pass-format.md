# 1. Passes are signed tokens the guard device can verify offline

Date: 2026-11-10

Status: Accepted

## Context

The guard must decide ADMIT or REFUSE in under a second, often with no signal (requirements §5, §9). So the device cannot ask the server whether a pass is real. It needs to check the pass on its own, and a visitor must not be able to forge or alter one (threat model #1, #2).

The pass travels as a QR code on the visitor's phone, so it has to be small enough to scan reliably from a cracked screen in sunlight.

## Decision

A pass is a **JWS in compact form** (a signed JWT), signed by the server with **ES256** (ECDSA on P-256 with SHA-256). We use the `jose` library on both the server and the device.

The signed claims are:

| Claim  | Meaning                                                   |
| ------ | --------------------------------------------------------- |
| `jti`  | Pass id (uuid).                                           |
| `est`  | Estate id. A device refuses a pass for another estate.    |
| `unit` | Unit id, and `unitLabel` for display (e.g. "B4").         |
| `name` | Visitor name, shown to the guard.                         |
| `nbf`  | Valid from (Unix seconds).                                |
| `exp`  | Valid until (Unix seconds).                               |
| `uses` | How many entries the pass allows.                         |

The protected header carries `alg: ES256` and a `kid`, the id of the signing key.

The device holds the estate's **public** keys, refreshed while online. The private key stays on the server, in an environment variable, and is never sent to a client.

Verification on the device runs in a fixed order and returns one specific reason: unreadable, unknown key, bad signature, wrong estate, not yet valid, expired, cancelled, used up. The "cancelled" and "used up" checks use the revocation list and use counts the device last synced; the signature cannot know about them.

Rules enforced when a pass is issued: the window must be at least one minute and at most 24 hours long, and `uses` must be between 1 and 10.

A **short code** is not a credential. It is a lookup key for a pass the device has already synced. Typing a code works offline only for passes that reached the device before the connection dropped.

## Alternatives considered

- **Random pass id, checked against the server.** Simplest, but fails at a gate with no signal.
- **Random id checked against a synced list only.** Works offline, but a pass made after the last sync is refused, and the list itself becomes the secret.
- **HMAC (HS256).** Smaller tokens, but every device would hold the secret that mints passes, so one stolen phone could forge them.
- **Ed25519 (EdDSA).** Smaller and faster than ES256, but Web Crypto support arrived late in some browsers. ES256 works on any phone a guard is likely to have.
- **A custom format.** No. A standard format means standard libraries and a reviewer who can read it at a glance.

## Consequences

- A forged or altered pass is refused offline (threat model #1, #2).
- The visitor's name is readable by anyone who sees the QR code. It is the visitor's own name on their own phone, and nothing else personal is in the token.
- Cancellation offline is only as fresh as the last sync (threat model #4); short lifetimes limit the exposure.
- Two offline devices can each admit a single-use pass once before they sync (threat model #3). The server detects this on upload.
- Key rotation works by `kid`: publish a new key, start signing with it, and retire the old one after the longest pass lifetime has passed.
- The device clock decides `nbf` and `exp`. Verification allows 2 minutes of drift, and each entry records the device time so large drift is visible (threat model #12).
