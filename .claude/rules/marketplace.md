# Rule: Marketplace

**Canonical:** [marketplace domain](../../docs/domains/marketplace/) ·
[ECONOMY_INTEGRITY_RULES.md](../../docs/constitution/ECONOMY_INTEGRITY_RULES.md)

---

> **The highest-risk domain in the product.** Every classic marketplace exploit applies.
> All of them.

## Not implemented

Nothing exists. This rule states the constraints the first implementation must satisfy.

## The atomic operation

A purchase is **one transaction** containing:

```text
debit buyer → credit seller (minus fee) → credit platform revenue
→ transfer ownership from escrow → close the listing
→ write ledger entries → enqueue the outbox event
```

**There is no acceptable intermediate state.** Not "money moved, ownership pending". Not
"ownership moved, settlement queued".

## The exploits it must resist

| Exploit                         | What stops it                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Double sale**                 | `SERIALIZABLE` + listing status checked **inside** the transaction. A check before the transaction is a race, and the race sells one creature twice |
| **Price manipulation**          | The server reads the price from the listing row. `expectedPrice` is _compared_, never used                                                          |
| **Selling what you do not own** | Ownership verified at listing time, **and** the asset is locked                                                                                     |
| **Escrow bypass**               | A listed asset cannot be used, consumed, transferred or re-listed                                                                                   |
| **Retry duplication**           | Idempotency keys on create, cancel and purchase                                                                                                     |
| **Wash trading**                | Detection is moderation's job; the domain must record enough to make it detectable                                                                  |
| **Scraping**                    | Search is rate-limited and cursor-paginated                                                                                                         |

## `expectedPrice` is not decoration

It makes a purchase a **compare-and-swap**. If the price changed between browsing and buying,
the purchase fails rather than silently charging a different amount.

## Search

The heaviest read surface in the game — filtered by species, rarity, price, level and stage,
sorted several ways, over a table that changes constantly.

Response order: composite indexes matched to the **real** filter combinations → short-TTL
caching of popular queries → a dedicated read path.

**Not a search engine.** See [non-goals](../../docs/product/NON_GOALS.md).

## Never

- Move currency without moving ownership in the same transaction, or vice versa
- Accept a client-supplied price as authoritative
- Sell one listing twice, even under concurrency
- Pay a seller before the buyer's currency has actually moved
- Hard-delete a listing or an order
- Let real money touch a listing while
  [E9](../../docs/constitution/ECONOMY_INTEGRITY_RULES.md#e9-real-money-withdrawal-stays-disabled)
  holds

## Watch the prices

A sudden price collapse for one species is usually the **first visible symptom of a
duplication bug**, before reconciliation catches it.
