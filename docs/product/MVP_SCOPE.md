# MVP Scope

> **Status: PROPOSED.** Date: 2026-07-28. Requires product-owner approval before
> implementation. Audience: everyone planning work.

---

## What exists today (verified)

The **development platform**, and nothing else. No gameplay feature is implemented — by
design, not by omission. See [current state](../status/CURRENT_STATE.md).

## What the MVP is for

To answer one question: **do players find the collect → develop → compete loop worth
returning to, and does a player-to-player marketplace behave sanely with real users?**

Everything below is scoped to answer that. Anything that does not help answer it is
[future scope](FUTURE_SCOPE.md).

---

## Proposed MVP contents

### In scope

| Area                   | Included                                                              | Explicitly excluded from MVP                    |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| **Identity**           | Email + password, email verification, password reset, session refresh | Social login, 2FA, account merge                |
| **Player profile**     | Display name, avatar selection, basic stats                           | Profile customisation, titles, badges           |
| **Creature catalogue** | A bounded first set of species with versioned stats                   | The full roster                                 |
| **Owned creatures**    | Acquire, view, rename, favourite                                      | Trading beyond the marketplace                  |
| **Progression**        | Levels and experience                                                 | Evolution, star development                     |
| **Inventory**          | Materials, stacking, capacity                                         | Crafting                                        |
| **Teams**              | One team, fixed size                                                  | Multiple loadouts, presets                      |
| **Battle**             | Deterministic resolution, replay log                                  | Real-time or synchronous battle                 |
| **PvE**                | A linear campaign with a small number of stages                       | Difficulty tiers, raids                         |
| **Arena**              | Asynchronous PvP against snapshotted opponent teams                   | Live PvP, matchmaking ranks, seasons            |
| **Exploration**        | Timed expeditions producing materials                                 | Multi-stage or branching expeditions            |
| **Marketplace**        | Fixed-price listings, escrow, purchase, cancel, expiry                | Auctions, bidding, offers, price history        |
| **Economy**            | `SOFT` currency, full ledger, reconciliation                          | `PREMIUM`, `PROMO`, `FIAT`, any real-money flow |
| **Quests**             | Daily quests with claimable rewards                                   | Seasonal, chained, achievements                 |
| **Notifications**      | In-app only                                                           | Push, email marketing                           |
| **Administration**     | Authenticated console: player lookup, audit view, feature flags       | Bulk operations, direct data edit               |
| **Audit**              | Every economy and admin action recorded                               | Player-visible history UI                       |
| **Localization**       | `tr-TR` and `en`, complete                                            | Any third locale                                |
| **Platforms**          | Web, Android, iOS                                                     | Tablet-optimised layouts, desktop app           |

### Firmly out of the MVP

- **Real-money purchase or withdrawal.** Not a scope decision — a legal and compliance one.
  See [E9](../constitution/ECONOMY_INTEGRITY_RULES.md#e9-real-money-withdrawal-stays-disabled).
- **Habitats, crafting, evolution, star development, exhibitions, social/friends,
  moderation tooling, guilds, events, seasons.** All are in the domain map because the
  architecture must not preclude them. None is needed to answer the MVP question.
- **Live/synchronous multiplayer.** Asynchronous battle answers the question at a fraction
  of the cost and risk.

---

## The economy decision that shapes the MVP

**The MVP ships with `SOFT` currency only**, with the complete ledger, escrow and
reconciliation machinery behind it.

This looks like extra work for a smaller feature, and it is deliberate:

- the ledger is the part that is _impossible_ to retrofit — a marketplace built on mutable
  balances has no history to reconstruct;
- with only `SOFT` currency there is no real-money exposure, so an economy bug during
  testing costs nothing but a reset;
- it lets the marketplace be tested with real players before any legal obligation exists.

Adding `PREMIUM` later is a new currency in an existing, proven ledger. Adding a ledger
later is a rewrite.

---

## Definition of done for the MVP

- [ ] Every in-scope domain has an approved specification before implementation.
- [ ] `pnpm verify` passes.
- [ ] Integration tests pass against real PostgreSQL and Redis.
- [ ] Economy invariants pass, including under concurrent access.
- [ ] Both locales complete; no hardcoded user-facing string.
- [ ] Both mobile platforms build and run on a device.
- [ ] A threat model exists for identity, marketplace and economy.
- [ ] Backup and restore have been **executed**, not merely documented.
- [ ] Reconciliation runs on a schedule and alerts on a non-zero result.

## Sequencing

Roughly in this order, because each depends on the previous:

1. Domain specification package (the approved designs) — [CW-0002](../tasks/BACKLOG.md)
2. Identity + player profile
3. Data model + migrations for the MVP domains
4. Creature catalogue + owned creatures + progression
5. Battle engine + PvE
6. Inventory + exploration
7. Economy ledger
8. Marketplace on top of the ledger
9. Arena
10. Quests + notifications
11. Admin console + audit views
12. Hardening, localization completeness, store submission

Related: [Future scope](FUTURE_SCOPE.md) · [Non-goals](NON_GOALS.md) ·
[Backlog](../tasks/BACKLOG.md)
