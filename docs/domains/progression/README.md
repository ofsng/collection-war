# Domain: Progression

> **Tier 2 — Core.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.
> Covers domain concerns 5 (progression), 6 (evolution) and 7 (star development).

## 1. Purpose

How an owned creature gets stronger: levels, evolution and star development.

These three are one domain because they share one aggregate (the owned creature), one set of
invariants (a creature's power must be derivable and bounded), and they always change
together. Splitting them would create three modules that can never be modified independently.

## 2. Responsibilities

- Granting experience and applying level-ups.
- Applying evolution when its conditions are met.
- Applying star development when its costs are paid.
- Computing a creature's **effective stats** from base stats plus progression.
- Enforcing progression limits.

## 3. Owned data

| Table                          | Holds                                                             |
| ------------------------------ | ----------------------------------------------------------------- |
| `creature_progression_history` | **Immutable**: every level, evolution and star change, with cause |

Progression _state_ (level, stage, stars) lives on `owned_creatures` and is owned by
[owned-creatures](../owned-creatures/). This domain owns the **rules and the history**, not
the row.

That split is deliberate: two domains writing the same row would need to coordinate, so
exactly one writes it and the other supplies the decision.

## 4. Public interface

```text
grantExperience(creatureId, amount, source, tx) → Result<ProgressionResult>
canEvolve(creatureId) → Result<EvolutionEligibility>
evolve(creatureId, playerId, idempotencyKey) → Result<EvolutionResult>
addStar(creatureId, playerId, idempotencyKey) → Result<StarResult>
computeEffectiveStats(creature, contentVersion) → Stats
```

`computeEffectiveStats` is **pure**. It takes state and content and returns numbers, with no
I/O — which is what lets the battle engine call it without becoming impure itself.

## 5. Incoming dependencies

`battle` (post-battle experience) · `pve` · `arena` · `exploration` · `quests` ·
`owned-creatures` (stat display)

## 6. Outgoing dependencies

`creature-catalog` (evolution rules, base stats) · `owned-creatures` (the row) ·
`inventory` (evolution and star materials) · `economy` (currency costs)

## 7. Domain events

`Progression.ExperienceGranted` · `Progression.LevelReached` · `Progression.Evolved` ·
`Progression.StarAdded`

## 8. Security concerns

- **Experience amounts come from the server**, always. A client-supplied amount is an instant
  max-level exploit.
- **Evolution and star-up consume materials and currency**, so they are economy operations:
  transactional, idempotent, audited.
- **Idempotency is essential.** A retried evolve must not consume materials twice.
- **Limits are enforced server-side.** Level caps, star caps, evolution prerequisites.

## 9. Economy concerns

Progression is a major **currency and material sink** — one of the main things that stops
soft currency inflating.

Two consequences:

- Its costs are balance levers, and changing them changes the whole economy.
- Progression **increases a creature's marketplace value**, so a bug that grants free
  progression is a bug that mints tradeable value.

## 10. Expected scaling pressure

`grantExperience` runs after every battle and every expedition, making it one of the highest
write-volume operations in the game. It must be a cheap, indexed, single-row update inside an
existing transaction — never a read-modify-write of a large aggregate.

## 11. What this domain must never do

- Never accept a client-supplied experience amount, level or stat value.
- Never grant progression outside a transaction.
- Never consume materials or currency without an idempotency key.
- Never write `owned_creatures` directly — go through that domain's interface.
- Never let effective stats depend on anything the server did not compute.
- Never allow progression beyond the caps defined by the content version in force.

Related: [Owned creatures](../owned-creatures/) · [Creature catalog](../creature-catalog/) ·
[Inventory](../inventory/) · [Economy](../economy/)
