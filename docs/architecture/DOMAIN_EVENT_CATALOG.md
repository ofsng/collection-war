# Domain Event Catalog

> Audience: anyone publishing or consuming an event. Date: 2026-07-28.
> Mechanism: [EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md). This is the register.

---

## Rules

**Name:** `Domain.SubjectVerbedPast` — a statement of fact, never a request.
**Version:** bump on any incompatible payload change. A queued v1 payload may still be in
flight during a deploy, so both are consumed until the old ones drain.
**Delivery:** at-least-once, through the outbox. **Every consumer must be idempotent.**
**Payload:** ids and primitives. Never a whole aggregate — it would be stale by the time it
was consumed, and it couples the consumer to the producer's shape.

---

## The register

### Identity

| Event                        | v   | Published when            | Payload                            | Consumers                              |
| ---------------------------- | --- | ------------------------- | ---------------------------------- | -------------------------------------- |
| `Identity.AccountRegistered` | 1   | Registration commits      | `accountId`, `registeredAt`        | player-profile, analytics              |
| `Identity.SessionRevoked`    | 1   | Logout or reuse detection | `accountId`, `sessionId`, `reason` | audit, notifications                   |
| `Identity.PasswordChanged`   | 1   | Password changes          | `accountId`                        | notifications (security notice), audit |

### Player profile

| Event                         | v   | Published when            | Payload                                | Consumers |
| ----------------------------- | --- | ------------------------- | -------------------------------------- | --------- |
| `PlayerProfile.Created`       | 1   | Profile created           | `playerId`, `accountId`, `displayName` | analytics |
| `PlayerProfile.LocaleChanged` | 1   | Locale preference changes | `playerId`, `from`, `to`               | analytics |

### Owned creatures

| Event                                 | v   | Published when                          | Payload                                              | Consumers                     |
| ------------------------------------- | --- | --------------------------------------- | ---------------------------------------------------- | ----------------------------- |
| `OwnedCreatures.Acquired`             | 1   | A creature enters a player's collection | `playerId`, `creatureId`, `speciesId`, `source`      | collection, quests, analytics |
| `OwnedCreatures.OwnershipTransferred` | 1   | Marketplace sale completes              | `creatureId`, `fromPlayerId`, `toPlayerId`, `reason` | collection, audit, analytics  |
| `OwnedCreatures.Locked` / `.Unlocked` | 1   | Listed / delisted                       | `creatureId`, `reason`                               | —                             |

`source` is `starter` · `battle_reward` · `summon` · `purchase` · `admin_grant`. It is what
makes every creature in the game traceable to how it appeared.

### Progression

| Event                           | v   | Published when        | Payload                                                  | Consumers                     |
| ------------------------------- | --- | --------------------- | -------------------------------------------------------- | ----------------------------- |
| `Progression.ExperienceGranted` | 1   | Experience is applied | `playerId`, `creatureId`, `amount`, `source`             | analytics                     |
| `Progression.LevelReached`      | 1   | A creature levels up  | `playerId`, `creatureId`, `level`                        | quests, collection, analytics |
| `Progression.Evolved`           | 1   | Evolution completes   | `playerId`, `creatureId`, `fromSpeciesId`, `toSpeciesId` | collection, quests            |

`LevelReached` is separate from `ExperienceGranted` because consumers care about the
threshold, not the increment — and re-deriving "did that cross a level" in each consumer is
how they end up disagreeing.

### Battle and PvE

| Event             | v   | Published when        | Payload                                                                         | Consumers                           |
| ----------------- | --- | --------------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| `Battle.Resolved` | 1   | A battle is recorded  | `battleId`, `playerId`, `outcome`, `nodeId?`, `engineVersion`, `contentVersion` | pve, quests, progression, analytics |
| `PvE.NodeCleared` | 1   | First clear of a node | `playerId`, `nodeId`, `chapterId`                                               | quests, analytics                   |

**`Battle.Resolved` is the busiest event in the game.** It is what lets quests, progression
and analytics react without the battle module knowing any of them exist.

### Inventory

| Event                     | v   | Published when  | Payload                                     | Consumers                     |
| ------------------------- | --- | --------------- | ------------------------------------------- | ----------------------------- |
| `Inventory.ItemsGranted`  | 1   | Materials added | `playerId`, `items[]`, `source`, `sourceId` | quests, collection, analytics |
| `Inventory.ItemsConsumed` | 1   | Materials spent | `playerId`, `items[]`, `reason`             | quests, analytics             |

### Economy — **not in the slice**

| Event                          | v   | Published when                                                       |
| ------------------------------ | --- | -------------------------------------------------------------------- |
| `Economy.TransferRecorded`     | 1   | A ledger transfer commits                                            |
| `Economy.RewardGranted`        | 1   | A currency reward is granted                                         |
| `Economy.ReconciliationFailed` | 1   | **Pages a human.** Value created or destroyed without a counterparty |

### Marketplace — **not in the slice**

| Event                                                                                   | v   | Published when   |
| --------------------------------------------------------------------------------------- | --- | ---------------- |
| `Marketplace.ListingCreated` / `.ListingSold` / `.ListingCancelled` / `.ListingExpired` | 1   | State transition |

---

## Slice scope

Published and consumed in the first vertical slice:

`Identity.AccountRegistered` · `PlayerProfile.Created` · `PlayerProfile.LocaleChanged` ·
`OwnedCreatures.Acquired` · `Battle.Resolved` · `Inventory.ItemsGranted` ·
`Progression.ExperienceGranted` · `Progression.LevelReached`

> **Consumers are not implemented in the slice.** Events are written to the outbox and the
> relay worker is not built yet, so nothing consumes them.
>
> This is deliberate and worth stating plainly: the events must exist **from the first
> write**, because retrofitting an event stream means reconstructing history that was never
> recorded. An unconsumed outbox row is cheap; a missing one is unrecoverable.

---

## Adding an event

1. Add a row here first.
2. `Domain.SubjectVerbedPast`, version 1.
3. Payload: ids and primitives only.
4. Enqueue **inside** the producing transaction.
5. Every consumer idempotent — delivery is at-least-once.
6. Test that it is enqueued, and that its consumer is safe to run twice.

Related: [EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md) ·
[BACKGROUND_JOB_CATALOG.md](BACKGROUND_JOB_CATALOG.md)
