# Domain: Marketplace

> **Tier 1 — Critical.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.
> The highest-risk domain in the product.

## 1. Purpose

Let players trade creatures and items with each other, safely, for in-game currency.

## 2. Responsibilities

- Creating, listing, cancelling and expiring listings.
- Holding the listed asset in escrow.
- Executing a purchase atomically: currency one way, ownership the other.
- Applying platform fees.
- Search, filtering and browsing.

## 3. Owned data

| Table            | Holds                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| `listings`       | Seller, asset type and id, price, status, created/expires at, version |
| `orders`         | **Immutable**: buyer, listing, price paid, fee, completed at          |
| `listing_events` | **Immutable**: created, cancelled, sold, expired                      |

Listing status is a strict state machine: `ACTIVE → SOLD | CANCELLED | EXPIRED`. Terminal
states are terminal.

## 4. Public interface

```text
createListing(sellerId, assetRef, price, idempotencyKey) → Result<ListingId>
cancelListing(sellerId, listingId, idempotencyKey) → Result<void>
purchase(buyerId, listingId, expectedPrice, idempotencyKey) → Result<OrderId>
search(filter, page) → Result<CursorPage<ListingView>>
getListing(listingId) → Result<ListingView>
```

`expectedPrice` is not decoration. It makes the purchase a **compare-and-swap**: if the price
changed between browsing and buying, the purchase fails rather than silently charging a
different amount.

## 5. Incoming dependencies

`player-profile` (seller display) · `quests` (trading objectives) ·
`administration` (moderation, forced cancellation)

## 6. Outgoing dependencies

`economy` (escrow, payment, fees, settlement) · `owned-creatures` (lock, transfer) ·
`inventory` (item listings) · `audit` · `notifications`

## 7. Domain events

`Marketplace.ListingCreated` · `Marketplace.ListingSold` · `Marketplace.ListingCancelled` ·
`Marketplace.ListingExpired`

## 8. Security concerns

**Every classic marketplace exploit applies. All of them.**

- **Double sale.** Two buyers purchasing the same listing concurrently. Prevented by
  `SERIALIZABLE` isolation plus a listing status check inside the transaction — a check
  before the transaction is a race, and the race sells one creature twice.
- **Price manipulation.** The server reads the price from the listing row. `expectedPrice`
  is compared, never used.
- **Selling what you do not own.** Ownership is verified at listing time **and** the asset is
  locked, so it cannot be sold, consumed or used elsewhere while listed.
- **Escrow bypass.** The asset moves to escrow when listed. A seller who could still use it
  could sell it, use it, then cancel.
- **Retry duplication.** Idempotency keys on create, cancel and purchase.
- **Self-dealing and wash trading.** Two accounts trading to launder currency or inflate
  apparent value. Detection is moderation's job; the domain's job is to record enough data
  to make it detectable.
- **Scraping.** Search is a public, expensive read — rate-limited and cursor-paginated.

## 9. Economy concerns

**This domain moves more value than any other, and every currency rule applies to it.**

A purchase is one transaction containing: debit buyer, credit seller (minus fee), credit
platform revenue, transfer ownership from escrow, close the listing, write the ledger
entries, enqueue the outbox event.

There is **no acceptable intermediate state**. Not "money moved, ownership pending". Not
"ownership moved, settlement queued".

Additional economy properties:

- Fees are a **currency sink** and one of the main inflation controls.
- Marketplace prices are the clearest signal of an economy bug — a sudden price collapse for
  one species usually means it is being duplicated.
- Expiry must return the asset to the seller, transactionally.

## 10. Expected scaling pressure

**The heaviest read surface in the game.** Search is filtered by species, rarity, price
range, level and stage, and sorted several ways, over a table that changes constantly.

Response, in order: composite indexes matched to the real filter combinations; short-TTL
caching of popular queries; a dedicated read path if needed. **Not a search engine** — see
[non-goals](../../product/NON_GOALS.md).

## 11. What this domain must never do

- Never move currency without moving ownership in the same transaction, or vice versa.
- Never accept a client-supplied price as authoritative.
- Never allow a listed asset to be used, consumed, transferred or re-listed.
- Never sell a listing twice, even under concurrency.
- Never complete a purchase without an idempotency key.
- Never allow a seller to receive payment before the buyer's currency has actually moved.
- Never let real money touch a listing while
  [E9](../../constitution/ECONOMY_INTEGRITY_RULES.md#e9-real-money-withdrawal-stays-disabled)
  holds.
- Never hard-delete a listing or an order.

Related: [Economy](../economy/) · [Owned creatures](../owned-creatures/) ·
[Economy integrity rules](../../constitution/ECONOMY_INTEGRITY_RULES.md)
