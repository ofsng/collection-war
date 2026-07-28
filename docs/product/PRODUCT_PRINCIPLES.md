# Product Principles

> **Status: PROPOSED.** Date: 2026-07-28. Requires product-owner approval.
> Audience: anyone making a product or design decision.

These are the tie-breakers. When two options both work, these say which one to pick.

---

## 1. A player's collection is theirs

Time invested in a collection is the core of the product. Therefore:

- **Nothing is silently taken away.** No stealth nerfs to owned creatures, no expiring
  ownership, no "we rebalanced and your creature is now worse" without a stated migration.
- **Ownership is auditable.** A player can be told where a creature came from and where it
  went.
- **Deletion is deliberate.** Player-owned records are soft-deleted; genuine erasure is an
  explicit, audited process.

## 2. The player can always find out why

Deterministic battles, recorded seeds and content versions exist so that "why did I lose?"
has an answer.

A game that cannot explain its outcomes trains players to assume it is rigged, and in a game
with a real economy that assumption is fatal.

## 3. Fair before fun, in the economy only

For most of the product, fun wins. In the economy, fairness wins — every time.

A trade that is fun but exploitable destroys the market it happens in. This is why economy
changes are slow, tested and reviewed while a UI change can ship the same day.

## 4. Scarcity is designed, not accidental

Every faucet and every sink is a deliberate decision with a recorded rationale. An
unintended faucet is an inflation bug; an unintended sink is a player-trust bug.

The ledger makes both visible — see
[E12](../constitution/ECONOMY_INTEGRITY_RULES.md#e12-reconciliation-is-a-scheduled-job-not-an-incident-response).

## 5. Turkish and English are equal

Not "localised later". Both locales ship together, catalogue completeness is a failing test,
and no user-facing string is hardcoded in any application.

Formatting is locale-correct, not merely translated: `1.234,56` and `1,234.56` are different
numbers, and getting that wrong in an economy is not cosmetic.

## 6. Respect the player's device and connection

The clients target phones on mobile networks. Therefore:

- every request is bounded by a timeout, and failures reach a retry state quickly;
- an unreachable server produces an explanation, never an infinite spinner;
- the app does not assume connectivity, and does not lose the player's action when it drops.

## 7. Accessible by default

Real semantic elements, labelled controls, 44pt touch targets, visible focus, and status
that is never conveyed by colour alone.

Cheap to do from the start. Expensive and often skipped if left until later.

## 8. Content is data, not code

Adding a creature, a quest or an event should be a content change with a version stamp — not
a deployment.

This is why content versioning exists in the shared kernel before any content does.

## 9. No dark patterns

No countdown pressure invented to force a purchase. No hidden odds. No currency conversions
designed to obscure real cost. No mechanic that pays out real money for a random outcome.

Partly ethics, partly the fact that app stores and regulators enforce most of it anyway.

## 10. Small, complete features

A feature ships when it is complete for the player — including its error states, its
localization, its accessibility and its tests. Half a feature behind a flag is inventory,
not progress.

---

Related: [Product vision](PRODUCT_VISION.md) · [MVP scope](MVP_SCOPE.md) ·
[Non-goals](NON_GOALS.md) · [Economy integrity rules](../constitution/ECONOMY_INTEGRITY_RULES.md)
