# ADR-0024: Server-authoritative game state

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

> Listed last, but it is the first principle. Every other decision assumes it.

## Context

Collection War runs on three clients, including a mobile app distributed through app stores.
An installed app can be unpacked, its traffic intercepted, its requests replayed and modified.
A browser's developer tools are one keystroke away.

The game has a real economy. Value that can be forged is value that will be forged, and the
consequences reach every honest player through the marketplace.

## Decision

**The server decides everything that matters. The client renders and requests.**

Decided server-side, without exception:

| Decision                     | If the client decided               |
| ---------------------------- | ----------------------------------- |
| Battle outcomes              | Every player wins every battle      |
| Reward contents              | Every player claims the rarest drop |
| Currency balances            | Infinite currency                   |
| Inventory contents           | Infinite items                      |
| Ownership                    | Take anyone's creature              |
| Marketplace prices and sales | Buy anything for 0                  |
| Progression and unlocks      | Instant max level                   |
| Anything time-gated          | Every expedition finishes instantly |

The client may **predict** to feel responsive — showing a battle animation, greying out an
unaffordable item — but the server's answer always wins, and disagreement is resolved in the
server's favour without argument.

**Client-supplied time is never trusted.** A device clock is attacker-controlled input.

**Client-supplied identifiers are re-authorised, never merely re-read.** Receiving
`creatureId` does not mean the requester owns that creature.

## Alternatives considered

**Client-authoritative with server validation.** More responsive, less server load. Rejected:
validating a claimed outcome means computing it server-side anyway — identical cost, plus an
entire trust surface. The apparent saving is illusory.

**Trusted client with anti-cheat.** The approach some games take. Rejected: it is an arms race
that the defender loses on a platform the attacker fully controls, and it does not fail safe.

**Optimistic client with server reconciliation.** Works for collaborative editing, where
conflicts are merged. Rejected here: "I won this battle" and "I did not" cannot be merged.

**Server-authoritative except for cosmetics.** This is, in fact, what is being done — but the
line is drawn at _what affects state_, not at _what feels important_. Anything touching
persistent state is server-decided.

## Positive consequences

- **Cheating requires breaking the server**, not the client.
- The economy can be trusted, which is what makes a marketplace viable at all.
- Battle results are reproducible and explainable.
- One implementation of every rule, not one per platform.
- A client bug cannot corrupt persistent state.
- Adding a fourth client requires no new rule implementation.

## Negative consequences

- **Every meaningful action is a network round trip.** Latency is player-visible, and the UI
  must be designed for it.
- The server carries all the computation.
- Offline play is impossible — an explicit [non-goal](../product/NON_GOALS.md).
- Optimistic UI must be written carefully, since it can be contradicted.
- More server code than a trusting design.

## Risks

- A well-meaning contributor moving a calculation client-side "for responsiveness". Mitigated
  by [dependency rules](../architecture/DEPENDENCY_RULES.md) preventing clients from importing
  storage or domain-mutation code, and by review.
- Latency harming feel for fast interactions. Mitigated by asynchronous battle resolution —
  the player is watching a replay, not waiting on a round trip per turn.

## Review conditions

**This decision is not open for revision** in any form that would let a client decide
persistent state. It is the foundation the economy, the audit trail and the marketplace all
rest on.

What _may_ be revisited: which specific interactions get optimistic prediction, and how
prediction is reconciled — both of which are presentation concerns that do not touch
authority.
