# ADR-0027: Asynchronous arena for the first release

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** CW-0100 Phase 1

> Required by §29 of the game brief: _"compare live turn-based PvP and asynchronous
> defensive-team arena. Choose the lower-risk first-release implementation through an ADR.
> Do not silently assume live PvP is required."_

## Context

The first release includes one ranked arena. Two shapes are possible, and the difference is
not a feature detail — it determines whether the system needs real-time infrastructure at all.

The arena is **not in the first vertical slice**. This decision is made now because it
determines whether the battle engine must support live, interleaved, two-player turn
submission — which would change the engine's design, and the engine **is** in the slice.

## Decision

**Asynchronous arena.** A player attacks a **snapshot** of another player's defence team,
resolved by the same deterministic engine, with no live opponent.

The engine therefore needs no session affinity, no reconnect handling and no real-time
transport. `BattleInput` already models participants generically, so a future live mode is
additive rather than a rewrite.

## Alternatives considered

**Live turn-based PvP.** More engaging, and the obvious mental model for "arena". Rejected
for the first release on cost and risk, not appeal:

- Requires WebSockets, matchmaking, presence, session affinity and reconnection — none of
  which exists ([non-goals](../product/NON_GOALS.md) names real-time multiplayer explicitly).
- Requires a **turn timer**, which is a new authority problem: what happens when a player
  stalls, disconnects deliberately, or their network drops mid-turn.
- Creates a rage-quit and disconnect-abuse surface needing its own policy and tracking.
- Needs a live population to match against. **At launch there is none**, so early players
  would wait for opponents who are not there — the worst possible first impression of the
  mode.
- Scaling a stateful battle session is a different operational problem from scaling a
  stateless API.

**Hybrid — async by default, live when both are online.** Rejected: it is both designs, with
the union of their costs, and two reward paths to balance and to keep fair.

## Positive consequences

- **Works with zero concurrent players**, which is exactly the launch condition.
- Reuses the battle engine unchanged — same determinism, same replay, same seed handling.
- No WebSockets, no matchmaking service, no presence, no reconnect logic.
- The API stays stateless, so it scales horizontally with no coordination.
- A defence snapshot is immutable, so a defender cannot alter the fight mid-attack.
- Rating and matchmaking can be computed in a background job rather than in real time.
- Every attack is replayable from its seed, which makes disputes answerable.

## Negative consequences

- **Less exciting than live PvP**, and some players will say so.
- A defence snapshot goes stale as its owner progresses; refresh rules must be designed.
- Defence-team AI must make plausible decisions, which is real design work — a badly
  automated defender feels unfair regardless of the maths.
- No spectating, and no live tension.
- Migrating to live PvP later means new infrastructure, though not a new engine.

## Risks

- **Snapshot staleness** producing unfair or trivial matches. Mitigated by refreshing on
  team change and bounding snapshot age.
- **Defence AI quality** dominating perceived fairness. Mitigated by keeping AI decisions
  deterministic and replayable, so a complaint can be investigated rather than argued about.
- Collusion — two accounts trading attacks. Mitigated by retaining full match history for
  detection ([arena domain](../domains/arena/)).

## Review conditions

- Revisit when there is a **concurrent player population large enough to matchmake against**
  — not before, regardless of how often live PvP is requested.
- If live PvP is adopted, it is a new ADR plus a real-time architecture document; the engine
  itself should not need to change.
- If defence AI proves to be the limiting factor on arena quality, that is a design problem,
  not a reason to reopen this decision.
