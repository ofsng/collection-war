# Domain: Inventory

> **Tier 2 — Core.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.
> Covers domain concern 8 (materials and inventory).

## 1. Purpose

What a player holds that is **not** a creature and **not** currency: materials, consumables,
and other stackable items.

## 2. Responsibilities

- Item definitions (authored content), and player-held stacks.
- Granting, consuming and transferring items.
- Stack limits and capacity.
- Enforcing that a player cannot spend what they do not have.

## 3. Owned data

| Table                    | Holds                                                                       |
| ------------------------ | --------------------------------------------------------------------------- |
| `item_definitions`       | Authored, versioned: type, stackability, rarity, localized text             |
| `inventory_entries`      | `player_id`, `item_definition_id`, quantity, version                        |
| `inventory_transactions` | **Immutable**: every grant and consumption, with reason and idempotency key |

`inventory_transactions` mirrors the ledger pattern for a reason: a quantity that can be
assigned rather than derived has no history, and "where did my materials go?" becomes a
guess. Quantities are reconcilable against transactions.

## 4. Public interface

```text
grant(playerId, itemId, quantity, reason, idempotencyKey, tx) → Result<void>
consume(playerId, itemId, quantity, reason, idempotencyKey, tx) → Result<void>
consumeMany(playerId, items[], reason, idempotencyKey, tx) → Result<void>
getInventory(playerId, page) → Result<CursorPage<InventoryEntry>>
hasQuantity(playerId, itemId, quantity) → Result<boolean>
```

`consumeMany` exists because a crafting recipe consumes several materials **atomically** —
consuming them one call at a time creates a window where a failure leaves the player short.

## 5. Incoming dependencies

`crafting` · `progression` (evolution and star materials) · `exploration` (rewards) ·
`habitats` · `quests` · `economy` (reward grants) · `administration`

## 6. Outgoing dependencies

`player-profile` (owner exists) · `audit`

## 7. Domain events

`Inventory.ItemsGranted` · `Inventory.ItemsConsumed` · `Inventory.CapacityReached`

## 8. Security concerns

- **Quantity forgery.** Server-computed, always. Never a client-supplied amount.
- **Negative quantities.** Rejected structurally — a negative consumption is a disguised
  grant.
- **Double consumption.** Idempotency keys on every mutation; a retry must not consume twice.
- **Race conditions.** Two concurrent crafts using the same last material must not both
  succeed. Optimistic concurrency on the entry, plus `SERIALIZABLE` for the consuming
  operation.
- **Capacity as a denial vector.** An unbounded inventory is a storage-abuse vector; capacity
  limits are enforced server-side.

## 9. Economy concerns

Materials are **tradeable value** even before they reach the marketplace: they convert into
progression, which converts into creature value.

Therefore inventory is subject to the full [economy integrity
rules](../../constitution/ECONOMY_INTEGRITY_RULES.md) — transactional, idempotent, audited,
reconcilable — despite not being currency.

## 10. Expected scaling pressure

High write volume: every expedition, battle and quest touches it. The hot path is "grant N of
item X to player Y", which must be a single indexed upsert.

Reads are dominated by "show my inventory", which is naturally paginated and cacheable per
player.

## 11. What this domain must never do

- Never allow a negative quantity.
- Never grant or consume outside a transaction.
- Never mutate a quantity without a corresponding transaction row.
- Never accept a client-supplied quantity.
- Never allow consumption without verifying the current quantity **in the same transaction**
  as the decrement.
- Never let one player's operation touch another player's inventory.
- Never hold currency — that is [economy](../economy/).

Related: [Crafting](../crafting/) · [Economy](../economy/) · [Exploration](../exploration/)
