# Domain: Crafting

> **Tier 2 — Core.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.

## 1. Purpose

Convert materials and currency into items, according to authored recipes.

## 2. Responsibilities

- Recipe definitions (authored, versioned).
- Checking eligibility: does the player have the inputs?
- Executing a craft: consume inputs, produce outputs, atomically.
- Recording craft history.

## 3. Owned data

| Table           | Holds                                                            |
| --------------- | ---------------------------------------------------------------- |
| `recipes`       | Versioned: inputs, outputs, currency cost, unlock conditions     |
| `craft_history` | **Immutable**: who crafted what, when, with which recipe version |

Crafting owns recipes and history. It owns **no** inventory rows — it asks
[inventory](../inventory/) to move them.

## 4. Public interface

```text
listRecipes(playerId, page) → Result<CursorPage<RecipeView>>
canCraft(playerId, recipeId, quantity) → Result<CraftEligibility>
craft(playerId, recipeId, quantity, idempotencyKey) → Result<CraftResult>
```

`canCraft` is advisory only. It exists so the UI can grey out an unaffordable recipe — the
authoritative check happens inside `craft`, in the same transaction as the consumption. A
UI-level check that the server trusts is a client-authority bug.

## 5. Incoming dependencies

`quests` (crafting objectives) · `administration` (recipe management)

## 6. Outgoing dependencies

`inventory` (consume inputs, grant outputs) · `economy` (currency cost) ·
`creature-catalog` (if a recipe produces a creature) · `audit`

## 7. Domain events

`Crafting.ItemCrafted` · `Crafting.RecipeUnlocked`

## 8. Security concerns

- **Recipe substitution.** The server resolves the recipe from its id and the current content
  version. A client-supplied input or output list is ignored entirely.
- **Partial execution.** Consuming inputs and producing outputs happens in one transaction.
  A failure between the two would destroy player materials.
- **Duplication via retry.** Idempotency keys, enforced by a unique constraint.
- **Quantity overflow.** `quantity` is bounded — a craft of 2³¹ items is a denial-of-service
  request, not a player action.
- **Concurrency.** Two concurrent crafts drawing on the same last material must not both
  succeed. Runs at `SERIALIZABLE`.

## 9. Economy concerns

Crafting is a **material sink and an item faucet**, which makes it one of the strongest
levers on the economy — and one of the easiest to get wrong.

A recipe whose output is worth more than its inputs is a **money printer**: players will
execute it in a loop, and the marketplace price of the output will collapse while the price
of the inputs spikes. Every recipe's economics must be reviewed as an economy change, not as
content.

## 10. Expected scaling pressure

Moderate write volume, spiky — players craft in bursts after acquiring materials. The cost is
concentrated in the transaction, which touches several inventory rows at `SERIALIZABLE`, so
serialization retries are expected and normal under load.

## 11. What this domain must never do

- Never consume inputs without producing outputs in the same transaction, or vice versa.
- Never accept client-supplied inputs, outputs, costs or recipe contents.
- Never craft without an idempotency key.
- Never write inventory rows directly — go through [inventory](../inventory/).
- Never allow a craft that the current content version does not define.
- Never let a recipe unlock condition be evaluated on the client.

Related: [Inventory](../inventory/) · [Economy](../economy/) · [Progression](../progression/)
