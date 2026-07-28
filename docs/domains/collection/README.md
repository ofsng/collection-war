# Domain: Collection

> **Tier 3 — Supporting.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.
> Covers domain concerns 16 (collection catalogue) and 17 (exhibitions).

## 1. Purpose

Track which species a player has **ever** owned, and let them display curated arrangements of
their collection.

## 2. Responsibilities

- Recording first acquisition of each species per player.
- Completion percentages and milestone rewards.
- Exhibitions: curated, displayable arrangements.
- Public collection views.

## 3. Owned data

| Table                   | Holds                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `collection_entries`    | `player_id`, `species_id`, `first_acquired_at`, highest stage seen |
| `collection_milestones` | Which completion rewards a player has claimed                      |
| `exhibitions`           | `player_id`, name, ordered creature ids, visibility                |

**Selling a creature does not erase its collection entry.** The player _did_ own it. This is
the central rule of the domain, and it is what makes the marketplace and the collection loop
compatible rather than opposed — otherwise trading would mean destroying your own progress.

## 4. Public interface

```text
recordAcquisition(playerId, speciesId, stage, tx) → Result<void>
getCollection(playerId) → Result<CollectionSummary>
getPublicCollection(playerId) → Result<PublicCollection>
claimMilestone(playerId, milestoneId, idempotencyKey) → Result<Rewards>
createExhibition(playerId, name, creatureIds) → Result<ExhibitionId>
```

## 5. Incoming dependencies

`player-profile` (display) · `social` (viewing a friend's collection) · `quests`

## 6. Outgoing dependencies

`owned-creatures` (acquisition events, exhibition membership) ·
`creature-catalog` (the full species list, for completion) · `economy` (milestone rewards)

## 7. Domain events

`Collection.SpeciesFirstAcquired` · `Collection.MilestoneReached` ·
`Collection.ExhibitionPublished`

## 8. Security concerns

- **Exhibitions must only contain creatures the player currently owns**, re-verified at
  render time. A creature sold after being added must disappear from the exhibition, not
  linger as a claim of ownership.
- **Public visibility is explicit.** A collection is private by default; making it public is
  an action, not a default.
- **Milestone claims are idempotent** — they grant rewards.
- **Exhibition names are user content**: a moderation and injection surface.

## 9. Economy concerns

Completion milestones are a **reward faucet**, and completion is driven partly by
marketplace purchases — so milestone rewards indirectly subsidise trading. Their value needs
economy review, not just content review.

## 10. Expected scaling pressure

Read-heavy and highly cacheable. Completion percentage is a count against the catalogue size
for a content version, so it can be cached per player and invalidated on
`SpeciesFirstAcquired`.

## 11. What this domain must never do

- Never remove a collection entry when a creature is sold or released.
- Never grant a milestone reward twice.
- Never show a creature in an exhibition that the player no longer owns.
- Never expose a private collection.
- Never own creature ownership — it records history, it does not decide who owns what.

Related: [Owned creatures](../owned-creatures/) · [Creature catalog](../creature-catalog/) ·
[Marketplace](../marketplace/)
