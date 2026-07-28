# Domain: Battle

> **Tier 2 — Core** (the engine itself is Tier 1 for determinism).
> Status: **CONTRACT ONLY.** Date: 2026-07-28.
> Covers domain concerns 10 (teams) and 11 (battle).

## 1. Purpose

Resolve a battle, deterministically and server-authoritatively, and record the result so it
can be replayed and explained.

## 2. Responsibilities

- Team composition and validation.
- Assembling battle input from server-held state.
- Invoking the deterministic engine.
- Persisting the result with its seed, engine version and content version.
- Serving the replay log to clients.

Teams live here because a team exists only to enter a battle. As a separate domain it would
have no invariants of its own.

## 3. Owned data

| Table           | Holds                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| `teams`         | `player_id`, ordered creature ids, name, version                                   |
| `battles`       | Participants, outcome, **seed**, engine version, content version, started/finished |
| `battle_events` | The ordered replay log                                                             |

`battles` rows are **immutable** once written. The seed and both versions are what make the
result replayable — without them a battle is an unexplainable number.

## 4. Public interface

```text
createTeam(playerId, creatureIds) → Result<TeamId>
validateTeam(playerId, teamId) → Result<TeamValidation>
resolveBattle(input: BattleInput) → BattleResult        // synchronous, pure
recordBattle(result, tx) → Result<BattleId>
getBattle(battleId, requesterId) → Result<BattleReplay>
```

`resolveBattle` is **synchronous by design**. An async signature would permit — and
eventually attract — an `await` on a database or cache inside resolution, which is precisely
what must never happen.

## 5. Incoming dependencies

`pve` · `arena` · `quests` (battle objectives) · `player-profile` (stats)

## 6. Outgoing dependencies

`owned-creatures` (team members, ownership) · `progression` (effective stats, then
experience) · `creature-catalog` (content) · `economy` (rewards)

## 7. Domain events

`Battle.Resolved` · `Battle.TeamChanged`

`Battle.Resolved` is what `pve`, `arena`, `quests`, `progression` and `analytics` react to —
none of which the battle domain needs to know about.

## 8. Security concerns

**The single most attractive target for cheating in the game.**

- **The client never computes an outcome.** It receives a result and animates it. A client
  that could decide would win every battle.
- **Team ownership is verified server-side** at resolution time, not at team creation time —
  a creature can be sold between the two.
- **Locked creatures cannot battle.** A creature listed on the marketplace is unavailable.
- **Replay integrity.** The seed is generated server-side and never accepted from a client.
  A client-chosen seed is outcome selection.
- **Rate limiting.** Battles grant rewards, so unlimited battles are unlimited rewards.

## 9. Economy concerns

Battles produce **rewards**, which makes them a faucet. Consequences:

- Reward grants are economy operations: transactional, idempotent, audited.
- A duplicated `Battle.Resolved` event must not grant rewards twice — the consumer is
  idempotent.
- Battle outcomes affect arena standing, which may affect rewards, which affects the economy.

## 10. Expected scaling pressure

Resolution is **CPU-bound, pure and parallelisable** — the one place where the purity
constraint pays off directly. If it becomes hot, it moves to workers as a scheduling change,
not a rewrite.

The replay log is the storage concern: a long battle produces many events. Bounded turn
counts and a retention policy for old replays are both required.

## 11. What this domain must never do

- Never accept a battle outcome, seed, or stat value from a client.
- Never perform I/O inside `resolveBattle` — no network, no filesystem, no database, no
  clock, no ambient randomness.
- Never depend on the iteration order of a `Map`, `Set` or object key list. That is the most
  common way a "deterministic" engine quietly stops being one.
- Never mutate its input.
- Never record a result without its seed, engine version and content version.
- Never grant rewards itself — it publishes a fact; [economy](../economy/) moves value.
- Never let a battle run unbounded.

## Bootstrap status

`packages/battle-engine` contains the **contract and the determinism machinery only**:
`BattleInput`, `BattleResult`, `BattleEngine`, the version stamp, and seven written
invariants with tests asserting the contract. There is no combat logic, no damage formula,
no ability system and no creature data — none of it has been specified.

There is also a test that fails if gameplay symbols appear before the specification is
approved.

Related: [PvE](../pve/) · [Arena](../arena/) · [Progression](../progression/) ·
[Engineering principles](../../constitution/ENGINEERING_PRINCIPLES.md#6-determinism-where-outcomes-are-disputed)
