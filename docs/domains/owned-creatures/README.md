# Domain: Owned Creatures

> **Tier 1 — Critical.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.

## 1. Purpose

The **instances** players own. Ownership, identity and history of every individual creature.

This is the domain the whole product is about, and the one whose data players care most about
losing.

## 2. Responsibilities

- Ownership: which player holds which creature, right now.
- Instance identity: nickname, acquisition source, acquisition time.
- Instance state: current level, experience, evolution stage, stars.
- Ownership transfer, including to and from marketplace escrow.
- Lifecycle: acquired, locked, released — never silently destroyed.

## 3. Owned data

| Table                        | Holds                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `owned_creatures`            | `player_id`, `species_id`, nickname, level, stage, stars, `acquired_at`, `acquired_via`, `version`, `deleted_at` |
| `creature_ownership_history` | **Immutable**: every transfer, with from, to, reason, timestamp                                                  |

`owned_creatures.player_id` is the single field that decides who owns what. Every write to it
goes through this domain, inside a transaction, with a history row.

## 4. Public interface

```text
acquire(playerId, speciesId, source) → Result<OwnedCreatureId>
getById(creatureId) → Result<OwnedCreature>
listByPlayer(playerId, filter, page) → Result<CursorPage<OwnedCreature>>
isOwnedBy(creatureId, playerId) → Result<boolean>
transferOwnership(creatureId, from, to, reason, tx) → Result<void>
lock(creatureId, reason, tx) → Result<void>      // e.g. listed on the marketplace
unlock(creatureId, tx) → Result<void>
rename(creatureId, playerId, nickname) → Result<void>
```

`transferOwnership` and `lock` take a transaction context: they are always part of a larger
atomic operation, never standalone.

## 5. Incoming dependencies

`battle` (team members) · `marketplace` (listing and sale) · `progression` ·
`collection` · `exploration` · `habitats` · `administration`

## 6. Outgoing dependencies

`creature-catalog` (species definition) · `player-profile` (owner exists) · `audit`

## 7. Domain events

`OwnedCreatures.Acquired` · `OwnedCreatures.OwnershipTransferred` ·
`OwnedCreatures.Locked` · `OwnedCreatures.Unlocked` · `OwnedCreatures.Renamed`

## 8. Security concerns

The most valuable non-currency target in the system.

- **Ownership forgery.** Every operation re-checks ownership server-side. Receiving a
  `creatureId` in a request never implies the requester owns it.
- **Enumeration.** A creature the requester does not own returns **404, not 403**.
- **Duplication.** Transfer is transactional and idempotent. A retried transfer must not
  create a second creature.
- **Lock bypass.** A creature listed on the marketplace must be unusable — not merely hidden
  from the UI. Using or consuming a locked creature is rejected at the domain level.
- **Nicknames are user content**, therefore a moderation and injection surface.

## 9. Economy concerns

**Creatures are the primary tradeable asset.** Every marketplace transaction moves one.
Consequences:

- Duplication is currency creation by another name, and it destroys the market for that
  species.
- Ownership and payment must move in one transaction — there is no acceptable state where a
  buyer has paid and does not own.
- Ownership history is the evidence for any dispute, so it is append-only.

## 10. Expected scaling pressure

The largest player-owned table: players × creatures. Hot paths are "list my creatures"
(filtered and sorted many ways) and "is this mine" (called on nearly every mutation).

Response: composite indexes matched to the real filter combinations; a partial index for
`deleted_at IS NULL`; cursor pagination throughout.

## 11. What this domain must never do

- Never allow ownership to change outside a transaction.
- Never allow ownership to change without a history row.
- Never hard-delete a creature. Ever.
- Never trust a client-supplied owner.
- Never let two players own the same creature, even transiently.
- Never compute battle outcomes or economy movements — it owns _who has what_, not _what
  happens_.
- Never allow a locked creature to be used, consumed or re-listed.

Related: [Creature catalog](../creature-catalog/) · [Marketplace](../marketplace/) ·
[Economy integrity rules](../../constitution/ECONOMY_INTEGRITY_RULES.md)
