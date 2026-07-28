# Future Scope

> **Status: PROPOSED.** Date: 2026-07-28.
> Audience: anyone deciding whether the architecture must accommodate something.

Things that are **not** in the [MVP](MVP_SCOPE.md) but are **not**
[non-goals](NON_GOALS.md) either. The architecture must not preclude them; nothing here is
committed, scheduled, or approved.

---

## Gameplay

| Feature                          | Why it is deferred                                     | What the architecture must not preclude                                                  |
| -------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **Evolution & star development** | Depends on the progression model being validated first | Owned creatures carry a version and an upgrade history; stats are derived, not baked     |
| **Crafting**                     | Needs inventory and materials to exist and be balanced | Crafting is a transactional inventory operation with idempotency, like any economy write |
| **Habitats**                     | A whole management loop; large and independent         | Time-based state resolved server-side, like exploration                                  |
| **Exhibitions**                  | Presentation layer on top of the collection catalogue  | Collections are queryable and shareable by a stable identifier                           |
| **Raids / co-op PvE**            | Multiplayer coordination is a large step               | Battle inputs already support more than two participants                                 |
| **Seasons & events**             | Needs live content operations                          | Content versioning exists from day one                                                   |
| **Guilds**                       | Social systems are their own product surface           | Player identity is separable from group membership                                       |
| **Live PvP**                     | Real-time is a different system, not an increment      | Deliberately NOT preserved — see [non-goals](NON_GOALS.md)                               |

## Economy

| Feature                   | Why deferred                                            | Prerequisite                                                                                                               |
| ------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **`PREMIUM` currency**    | Requires store integration and consumer-law obligations | A proven ledger; the currency kind already exists in the type system                                                       |
| **In-app purchase**       | App Store / Play Billing, refunds, tax                  | Legal review; purchase receipts validated server-side, never client-side                                                   |
| **`PROMO` grants**        | Needs support tooling and expiry handling               | Already a distinct currency kind so it cannot merge with `PREMIUM`                                                         |
| **Auctions & offers**     | Fixed-price must prove out first                        | Marketplace escrow already generalises to holding a bid                                                                    |
| **Marketplace fees**      | Needs a real market to price against                    | `applyBasisPoints` and the platform revenue account already exist                                                          |
| **Real-money withdrawal** | Legal, KYC/AML, tax, payment provider                   | See [E9](../constitution/ECONOMY_INTEGRITY_RULES.md#e9-real-money-withdrawal-stays-disabled). Behind a flag that stays off |

## Platform and operations

- **Push notifications** — needs APNs/FCM credentials, an account, and a consent model.
- **Remote feature flags** — environment flags are sufficient until there are players to segment.
- **A/B testing** — meaningless without traffic.
- **Data warehouse** — analytics events are typed and versioned now so that history exists when a warehouse arrives.
- **CDN for assets** — S3-compatible storage already sits behind an abstraction.
- **Read replicas** — a scaling response, not a design goal. See [scaling strategy](../architecture/SCALING_STRATEGY.md).
- **OpenTelemetry tracing** — structured logging with correlation ids first; tracing when there is more than one service to trace between.
- **Third locale** — the localization architecture supports it; adding one is a content and QA cost, not an engineering one.

## Engineering

- **Extracting a module into a service** — only when a measured constraint requires it, and only for a module whose boundary has held.
- **A real-time gateway** — WebSockets for notifications and live status, if polling proves insufficient.
- **Type-aware linting** — currently syntax-aware only; the type-checked rule set is slower and needs a project-service configuration. See [technical debt](../status/TECHNICAL_DEBT.md).
- **Unified design tokens across DOM and native** — mobile currently mirrors the palette. See [deferred work](../status/DEFERRED_WORK.md).
- **Mobile component and E2E testing on-device** — Maestro or Detox, plus CI capable of running an emulator.
- **A content authoring pipeline** — for creature, quest and balance data as versioned content.

---

## The rule for this list

Something belongs here if:

1. it is plausible within roughly two years, **and**
2. the architecture would be expensive to change if it turned out to be needed.

If neither holds, it belongs in [non-goals](NON_GOALS.md) — or nowhere at all. A future-scope
list that contains everything anybody ever mentioned provides no guidance.

Related: [MVP scope](MVP_SCOPE.md) · [Non-goals](NON_GOALS.md) ·
[Scaling strategy](../architecture/SCALING_STRATEGY.md)
