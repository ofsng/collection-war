# Anti-Cheat Architecture

> Audience: anyone implementing a game system. Date: 2026-07-28.

---

## Position

**Cheating is prevented by architecture, not detected by heuristics.**

A client-side anti-cheat is an arms race on hardware the attacker controls, and the defender
loses it. Collection War instead makes the interesting attacks _structurally impossible_, and
uses detection only for the things structure cannot prevent — collusion, botting,
multi-accounting.

---

## Layer 1 — Structural prevention

What the client is not given the ability to do, no matter what it sends.

| Attack                             | Why it cannot work                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| Claim a battle win                 | There is **no endpoint that accepts an outcome**. The server resolves the battle. |
| Inflate damage                     | The formula runs server-side in `battle-engine`. Client values are display-only.  |
| Choose a favourable seed           | The seed is generated server-side and disclosed **with** the result.              |
| Grant itself items or experience   | Rewards are computed server-side from the encounter's table.                      |
| Modify a stat                      | Stats are **derived** from species + level + potential, never sent by the client. |
| Complete an expedition early       | Completion is decided by **server time**.                                         |
| Level up without materials         | Consumption and validation are in the same transaction.                           |
| Replay a reward                    | Idempotency key + unique index.                                                   |
| Act with another player's creature | Ownership re-verified **inside the write**.                                       |
| Enumerate other players' creatures | UUIDv7 ids; not-owned returns **404**.                                            |

**None of these needs detection.** They fail at the boundary.

---

## Layer 2 — Validation

Every action is validated against server-held state before it is applied.

For a battle action, the server checks: battle exists and is the requester's · battle is
in progress · it is that creature's turn · the creature is alive · the ability exists on that
creature · it is off cooldown · energy is sufficient · the target is valid and alive · no
status forbids the action.

> **An invalid action never mutates state.** It returns an error and leaves the battle
> exactly as it was. A partially-applied invalid action is how an "impossible state" is born.

---

## Layer 3 — Detection

For what structure cannot prevent. These produce **risk signals**, not bans.

| Signal                                                | Indicates                      |
| ----------------------------------------------------- | ------------------------------ |
| Action timing far below human capability              | Automation                     |
| Perfectly regular action intervals                    | Automation                     |
| Many accounts from one device or address              | Multi-accounting               |
| Marketplace value cycling between a small account set | Wash trading                   |
| Arena wins concentrated between two accounts          | Win trading                    |
| Impossible reward velocity                            | An exploit already in progress |
| Repeated idempotency-key collisions                   | Retry abuse, or a probe        |
| Client version mismatch on signed fields              | Modified client                |

### The rule about acting on signals

> **Never ban on a single weak signal.**

A shared IP is a household or a campus. Fast actions are a good player on a good connection.
Signals accumulate into a **risk score**; a score crosses a threshold into **review**; a human
decides. Automated action is limited to reversible, proportionate measures — rate limiting, a
marketplace hold — never account termination.

Every automated action is audited with the signals that triggered it, so a wrong decision can
be explained and reversed.

---

## Layer 4 — Auditability

When something does go wrong, the system must be able to explain it.

| Question                             | Answered by                                        |
| ------------------------------------ | -------------------------------------------------- |
| Why did I lose that battle?          | The stored **seed + replay log + versions**        |
| Where did this material come from?   | `inventory_transactions.source_type` + `source_id` |
| Who has owned this creature?         | `creature_history`, append-only                    |
| Was value created from nothing?      | Ledger reconciliation                              |
| Who made this admin change, and why? | `audit_logs` with actor and justification          |

**Every economy incident should leave behind a test that would have caught it.** That is the
difference between a system that learns and one that repeats.

---

## What is never sent to a client

- Server secrets, signing keys, configuration
- Unreleased content, or drop tables for content not yet reached
- Drop weights and probability internals beyond the disclosed rates
- Fraud thresholds, risk scores, detection rules
- Another player's private state
- Internal error detail, stack traces, SQL

Disclosed probabilities **are** shown — hidden odds are a dark pattern
([product principles](../product/PRODUCT_PRINCIPLES.md)). What is withheld is the _detection_
machinery, not the _odds_.

---

## Rate limiting

Not yet implemented; required before launch. Scaled to risk rather than applied uniformly:

| Class                      | Rationale                                                   |
| -------------------------- | ----------------------------------------------------------- |
| Login, register, reset     | Tightest — credential stuffing is the highest-volume attack |
| Battle start, reward claim | Tight — these create value                                  |
| Marketplace write          | Tight — these move value                                    |
| Ordinary reads             | Loose                                                       |
| Health, readiness          | **Exempt** — an orchestrator probe must never be throttled  |

---

## Slice checklist

For the first vertical slice specifically:

- [x] No endpoint accepts a battle outcome
- [x] Seeds generated server-side
- [x] Rewards computed server-side
- [x] Stats derived, never accepted
- [x] Starter selection idempotent — one creature per player, ever
- [x] Reward grants idempotent
- [x] Ownership re-verified inside every write
- [x] Not-owned returns 404
- [ ] Rate limiting — **deferred**, and recorded as such
- [ ] Risk signals — **deferred**; the data model retains what detection will need

Related: [RANDOMNESS_AND_REPLAY.md](RANDOMNESS_AND_REPLAY.md) ·
[AUTHORIZATION_MATRIX.md](AUTHORIZATION_MATRIX.md) ·
[THREAT_MODEL.md](../security/THREAT_MODEL.md)
