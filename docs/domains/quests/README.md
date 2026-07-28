# Domain: Quests

> **Tier 2 — Core.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.

## 1. Purpose

Objectives that direct play and reward completion.

## 2. Responsibilities

- Quest definitions: objectives, rewards, availability windows.
- Tracking per-player progress.
- Detecting completion.
- Claiming rewards, exactly once.
- Daily and weekly resets.

## 3. Owned data

| Table               | Holds                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| `quest_definitions` | Versioned: objective type, target, rewards, availability                       |
| `quest_progress`    | `player_id`, `quest_id`, current progress, completed at, claimed at, reset key |
| `quest_claims`      | **Immutable**: who claimed what, when, with which key                          |

`reset_key` is the daily or weekly period identifier (`2026-07-28`). Making it part of the
row is what allows the same quest definition to be completed once per period without
deleting history — and without a reset job racing a claim.

## 4. Public interface

```text
listQuests(playerId) → Result<QuestView[]>
recordProgress(playerId, objectiveType, amount, tx) → Result<void>
claim(playerId, questId, idempotencyKey) → Result<QuestRewards>
```

`recordProgress` is called by event consumers, not by clients. Quests observe the game; they
do not ask the player what they did.

## 5. Incoming dependencies

`player-profile` (display) · `notifications` (completion alerts)

## 6. Outgoing dependencies

`economy` (rewards) · `inventory` (item rewards) · and it **consumes events** from
`battle`, `pve`, `arena`, `exploration`, `crafting`, `marketplace`, `collection`

## 7. Domain events

`Quests.ProgressRecorded` · `Quests.QuestCompleted` · `Quests.RewardClaimed`

## 8. Security concerns

- **Progress comes from server-side events**, never from a client. A client reporting "I won
  ten battles" is a free reward.
- **Claiming is idempotent** — this is the most likely duplication bug in the domain, because
  claiming is the action players repeat fastest when the network is poor.
- **Completion is verified at claim time**, not merely trusted from the progress row. The row
  could be stale, or written by a bug.
- **Reset boundaries** use server time and a stored `reset_key`. A client-supplied date is a
  free extra daily reward.
- **Availability windows** are enforced server-side.

## 9. Economy concerns

Quests are a **major, deliberately predictable faucet** — they are the mechanism that gives
a player a reliable daily income.

Two consequences: reward values are an economy lever rather than a content detail, and a
duplication bug here scales with the number of players rather than with the number of
exploiters.

## 10. Expected scaling pressure

`recordProgress` is called on nearly every meaningful player action, making it one of the
highest write-volume operations in the system.

Response: index on `(player_id, quest_id, reset_key)`; update only quests whose objective
type matches the event, rather than scanning all of a player's quests; and process progress
asynchronously from the event, since it need not be inside the originating transaction.

## 11. What this domain must never do

- Never accept client-reported progress.
- Never grant a reward twice.
- Never claim without verifying completion in the same transaction.
- Never use client time for resets or availability.
- Never let a reset job delete unclaimed rewards a player has already earned.
- Never call into the domains it observes — it consumes their events.

Related: [Economy](../economy/) · [Event architecture](../../architecture/EVENT_ARCHITECTURE.md)
