# Non-Goals

> **Status: PROPOSED.** Date: 2026-07-28.
> Audience: everyone. This is the most useful page for stopping work that should not start.

A non-goal is not "later". It is **not going to happen** unless this document changes, with
a recorded reason. [Future scope](FUTURE_SCOPE.md) is the list of "later".

---

## Product non-goals

**Not a gambling product.** No loot box paid for with real money that yields a
tradeable-for-cash outcome. No wagering. No random reward that can become withdrawable
value. This is structural — see
[E8](../constitution/ECONOMY_INTEGRITY_RULES.md#e8-random-rewards-never-become-withdrawable-value)
— and it is a line, not a preference.

**Not a cryptocurrency or NFT product.** No blockchain, no token, no on-chain ownership. The
ledger is a database table, which is faster, cheaper, reversible when something goes wrong,
and carries none of the regulatory or reputational load.

**Not a real-money trading platform.** Players trade with in-game currency. Cashing out is
disabled and stays disabled until a deliberate legal process says otherwise.

**Not pay-to-win.** Purchased currency must never buy a decisive competitive advantage. The
currency-kind separation exists partly to make this enforceable rather than aspirational.

**Not an esport.** No competitive integrity infrastructure, no spectating, no tournaments,
no anti-cheat arms race beyond server authority.

**Not a social network.** Friends and social features exist to support the game loop.
Feeds, messaging, and content sharing are not the product.

**Not a sandbox or user-generated-content platform.** Players collect and compete with
authored content. They do not create it.

---

## Technical non-goals

**Not microservices.** A modular monolith, deliberately, for as long as it works. See
[ADR-0005](../adr/ADR-0005-modular-monolith.md).

**Not Kubernetes.** Not at this scale. A container platform that runs one API process and
one worker process is a container platform whose complexity exceeds the system it runs.

**Not multi-cloud.** Cloud-neutral so lock-in is a decision rather than an accident — but
running on two providers at once is a cost with no corresponding benefit here.

**Not event-sourced everywhere.** The ledger is append-only because financial history must
be. Applying event sourcing to the whole system would multiply complexity for domains that
do not need it.

**Not offline-first.** The server is authoritative; a client that can play offline is a
client whose results cannot be trusted. Graceful failure is the goal, not offline play.

**Not real-time multiplayer.** Asynchronous battle resolution. WebSockets are reserved for
notifications and live status, not for synchronous gameplay.

**Not a desktop application.** Web, Android, iOS. Nothing else.

**Not a plugin or mod system.** Every extension point is an API surface to secure and
support forever.

**Not a custom CMS.** Content is versioned data with a schema and an admin interface, not a
general-purpose authoring platform.

**Not 100% test coverage.** Coverage is a diagnostic, not a target. Load-bearing code
(economy, ownership, battle, auth) is tested exhaustively; a layout component is not.

---

## Process non-goals

**Not chat-as-memory.** Decisions live in ADRs and task packets, in Git. A conversation is
not a record.

**Not "we'll document it later".** Documentation lands in the same change as the behaviour
it describes.

**Not per-tool duplicated rules.** One canonical rule set in `docs/`; tool configurations
point at it. See [documentation rules](../constitution/DOCUMENTATION_RULES.md).

**Not speculative infrastructure.** No monitoring stack, message broker, search cluster or
CDN before a measurement asks for one.

---

## How to change a non-goal

1. Write an ADR: what changed, what it costs, what it obliges the project to support forever.
2. Get owner approval — for the gambling, crypto and real-money items, legal review as well.
3. Move the entry to [future scope](FUTURE_SCOPE.md) or [MVP scope](MVP_SCOPE.md).
4. Update this document, with the date.

Related: [MVP scope](MVP_SCOPE.md) · [Future scope](FUTURE_SCOPE.md) ·
[Product principles](PRODUCT_PRINCIPLES.md)
