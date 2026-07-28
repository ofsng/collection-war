# Domain: Habitats

> **Tier 3 — Supporting.** Status: **PROPOSED, not implemented.** Not in the MVP.
> Date: 2026-07-28.

## 1. Purpose

Player-managed spaces that house creatures and produce value passively over time.

## 2. Responsibilities

- Habitat definitions: capacity, production rates, upgrade paths.
- Which habitats a player owns and their upgrade level.
- Assigning creatures to habitats.
- Accruing production over elapsed server time, and collecting it.

## 3. Owned data

| Table                 | Holds                                                        |
| --------------------- | ------------------------------------------------------------ |
| `habitat_definitions` | Versioned: capacity, production rate, upgrade costs          |
| `player_habitats`     | `player_id`, definition, level, `last_collected_at`, version |
| `habitat_assignments` | Which creatures are placed where                             |

`last_collected_at` is the accrual anchor and is written by the server only.

## 4. Public interface

```text
listHabitats(playerId) → Result<HabitatView[]>
assign(playerId, habitatId, creatureIds) → Result<void>
unassign(playerId, habitatId, creatureIds) → Result<void>
collect(playerId, habitatId, idempotencyKey) → Result<Collection>
upgrade(playerId, habitatId, idempotencyKey) → Result<void>
```

## 5. Incoming dependencies

`quests` (habitat objectives) · `player-profile` (display)

## 6. Outgoing dependencies

`owned-creatures` (assignment, reservation) · `inventory` (produced materials) ·
`economy` (produced currency, upgrade costs)

## 7. Domain events

`Habitats.CreatureAssigned` · `Habitats.ProductionCollected` · `Habitats.HabitatUpgraded`

## 8. Security concerns

Same shape as [exploration](../exploration/), because both are time-based accrual:

- **Accrual is computed from server timestamps only.**
- **Production is capped.** An uncapped accrual over a long absence is a large, uncontrolled
  reward — and an incentive to leave the game rather than play it.
- **Collection is idempotent.** A retried collect must not pay twice.
- **Assignment reserves creatures**; a reserved creature cannot battle or be listed.
- **Concurrent collect and upgrade** must not both apply against the same accrual window.

## 9. Economy concerns

A **passive faucet**, and the one most prone to over-tuning: production scales with the
number of accounts rather than with engagement, which makes multi-accounting profitable.

The production cap is not a UX detail — it is the economy control.

## 10. Expected scaling pressure

Low write volume, but accrual is computed on **every read** ("how much is waiting?"). That
computation must be a cheap arithmetic function of `last_collected_at`, production rate and
`now` — never a scan of an event log.

## 11. What this domain must never do

- Never accrue from client-supplied time.
- Never allow uncapped accrual.
- Never collect without an idempotency key.
- Never allow an assigned creature to be used elsewhere.
- Never grant production outside a transaction.

Related: [Exploration](../exploration/) · [Owned creatures](../owned-creatures/) ·
[Economy](../economy/)
