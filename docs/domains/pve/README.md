# Domain: PvE

> **Tier 3 — Supporting.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.

## 1. Purpose

Authored single-player content: campaign stages, their opponents, and a player's progress
through them.

## 2. Responsibilities

- Stage definitions: opponent teams, unlock conditions, rewards.
- Tracking per-player stage progress and first-clear state.
- Starting a stage attempt and handing it to [battle](../battle/).
- Deciding rewards on completion, and whether they are first-time-only.

## 3. Owned data

| Table          | Holds                                                           |
| -------------- | --------------------------------------------------------------- |
| `pve_stages`   | Versioned: opponent composition, unlock rules, reward table     |
| `pve_progress` | `player_id`, `stage_id`, cleared, first cleared at, best result |

## 4. Public interface

```text
listStages(playerId) → Result<StageView[]>
canAttempt(playerId, stageId) → Result<AttemptEligibility>
attemptStage(playerId, stageId, teamId, idempotencyKey) → Result<StageResult>
```

## 5. Incoming dependencies

`quests` (campaign objectives) · `player-profile` (progress display)

## 6. Outgoing dependencies

`battle` (resolution) · `creature-catalog` (opponents) · `economy` (rewards) ·
`inventory` (item rewards) · `progression` (experience)

## 7. Domain events

`PvE.StageAttempted` · `PvE.StageCleared` · `PvE.StageFirstCleared`

`StageFirstCleared` is separate because first-clear rewards are usually much larger, and
consumers must be able to distinguish them without re-deriving the fact.

## 8. Security concerns

- **Unlock conditions are enforced server-side.** A client requesting stage 50 with no
  prerequisites is rejected, not merely hidden from the UI.
- **Opponent teams are server-supplied.** A client-supplied opponent is a trivial way to farm
  rewards against nothing.
- **First-clear is idempotent.** A retried attempt must not grant the first-clear bonus
  twice — this is the most likely duplication bug in the domain.
- **Rate limiting.** Stages grant rewards; unlimited attempts are unlimited rewards.

## 9. Economy concerns

PvE is the **primary early-game faucet** — where most players get their first currency,
materials and creatures.

Its reward tables therefore set the baseline for the entire economy, and a stage that is
cheap to repeat relative to its rewards becomes a farm that inflates everything downstream.

## 10. Expected scaling pressure

Moderate. Progress rows are small and per-player. The read path ("show the campaign") is
cacheable per content version and per player progress state.

## 11. What this domain must never do

- Never let a client choose its opponent, its rewards, or its stage's difficulty.
- Never grant a first-clear reward twice.
- Never grant rewards outside a transaction.
- Never resolve a battle itself — that is [battle](../battle/).
- Never bypass unlock conditions, including for administrative convenience.

Related: [Battle](../battle/) · [Economy](../economy/) · [Quests](../quests/)
