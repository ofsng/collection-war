# Product Vision

> **Status: DERIVED, NOT APPROVED.** Date: 2026-07-28.
> Audience: everyone.

---

## An honest note about this document

This vision is **inferred from the domain structure** the platform was asked to support. No
product brief, design document or player research was provided during the bootstrap.

It is written down because an architecture built with no product model in mind ends up
serving no product well. It is marked unapproved because **the product owner has not
confirmed it**, and treating an inference as a decision is exactly the failure this project
is set up to avoid.

**Before gameplay work begins, this document must be reviewed and either confirmed or
replaced.** Tracked in [open decisions](../status/OPEN_DECISIONS.md).

---

## What Collection War appears to be

A **creature collection game** with three interlocking loops:

1. **Collect** — acquire creatures through exploration, PvE and the marketplace; complete a
   catalogue; display collections.
2. **Develop** — level, evolve and star-up creatures; gather materials; craft; build teams;
   manage habitats.
3. **Compete and trade** — battle in PvE and an arena; buy and sell in a player marketplace
   backed by a real economy.

Turkish and English from day one, on web, Android and iOS, with one shared server-authoritative backend.

## What makes it different from a generic collection game

The domain list points at three unusual commitments, and each one shapes the architecture:

**A real player economy.** A marketplace with escrow, ledgers, settlement and seller
balances is a far larger commitment than a shop. It implies players can lose value if the
system is wrong — which is why the
[economy integrity rules](../constitution/ECONOMY_INTEGRITY_RULES.md) are the strictest
rules in the project.

**Auditable outcomes.** Deterministic battle resolution and content versioning mean a
player can be told _why_ a result happened, months later. Most games cannot answer that
question.

**Cross-platform parity.** Three clients, one authoritative server, one shared contract.
Not a web game with a phone wrapper.

## Who it is for

Not yet established. The honest statement is that the target audience is **undecided**, and
the following are hypotheses to be tested, not conclusions:

- players who enjoy collection and completion more than reflex skill;
- players who enjoy an economy — pricing, trading, scarcity;
- a Turkish-first audience, given the locale priority, with English as reach.

## What success would look like

Deliberately unquantified, because inventing metrics without a product owner is worse than
having none. The shapes that matter:

- players return because the collection is theirs and progresses;
- the marketplace is liquid enough to be interesting and stable enough to be trusted;
- no economy incident ever requires a rollback of player-visible state;
- adding a creature or an event is a content change, not an engineering project.

## Principles the architecture already commits to

These are decided, and they constrain the product rather than the other way round:

- **The server decides everything that matters.** No client-authoritative shortcuts, ever.
- **No pay-to-win-by-accident.** Currency kinds are separated at the type level so that
  purchased, earned and granted value cannot silently merge.
- **No gambling mechanics that pay out.** A random reward can never become withdrawable
  money. See [E8](../constitution/ECONOMY_INTEGRITY_RULES.md#e8-random-rewards-never-become-withdrawable-value).
- **Turkish is not an afterthought.** It is the default locale, not a translation layer.

---

Related: [Product principles](PRODUCT_PRINCIPLES.md) · [MVP scope](MVP_SCOPE.md) ·
[Non-goals](NON_GOALS.md) · [Domain map](../domains/DOMAIN_MAP.md)
