# ADR-0015: A deterministic battle-engine package

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Battles decide rewards, arena standing and — through those — marketplace value. Players will
dispute results. Support will need to explain them. Balance work will need to reproduce them.

A battle system that cannot reproduce its own outcomes makes all three impossible, and trains
players to assume the game is rigged.

## Decision

**Battle resolution lives in its own package and is deterministic.** Same inputs plus same
seed produce byte-identical output, on any machine, in any process, forever.

Five properties, all enforced rather than intended:

1. **Framework-independent** — no NestJS, React, database or HTTP. Enforced by lint.
2. **Deterministic** — no `Date.now()`, no `Math.random()`, no iteration over unordered
   collections. The first two are enforced by lint.
3. **Pure** — `resolve()` returns a result and writes nothing.
4. **Server-authoritative** — the client may replay a result to animate it, never to decide
   one.
5. **Versioned** — every result records the engine version and content version that produced
   it.

`resolve()` is **synchronous by design**. An async signature would permit — and eventually
attract — an `await` on a database inside resolution, which is exactly what must never
happen. Keeping it sync makes the constraint structural rather than a convention.

## Alternatives considered

**Resolution inside the API service.** Simpler; one fewer package. Rejected: purity would
erode immediately. A service has a repository injected, and sooner or later someone fetches
something mid-resolution — at which point determinism is gone and nobody notices until a
replay disagrees.

**Client-side resolution with server verification.** Responsive, and cheaper on the server.
Rejected: verification means running the engine server-side anyway, so it costs the same and
adds an entire trust problem.

**Non-deterministic resolution with stored results.** Simpler. Rejected: the result can be
shown but never _explained_, balance changes cannot be tested against historical battles, and
a suspicious outcome cannot be investigated.

**A rules engine or scripting layer for designers.** Rejected for now: an interpreter is a
large security and determinism surface. Revisit if content velocity demands it.

## Positive consequences

- **A disputed battle can be replayed exactly**, from the stored seed and versions.
- Balance changes can be validated against a corpus of historical battles.
- Property-based testing is possible because the engine is pure.
- The client cannot influence an outcome.
- Being CPU-bound and pure, it parallelises perfectly — if it becomes hot, it moves to
  workers as a scheduling change rather than a rewrite.

## Negative consequences

- **Every input must be passed explicitly**, including the clock and the random source. More
  parameters, more assembly work at the call site.
- Adding a new random draw shifts every subsequent value unless streams are derived per
  purpose — which is why `deriveSeed(parent, purpose)` exists.
- Historical replay eventually requires keeping old rule sets available, which grows.
- Determinism is fragile in a specific, easy-to-miss way: iterating a `Map` or `Set` can
  produce order-dependent results. This is listed as an invariant precisely because it is the
  most common way a "deterministic" engine quietly stops being one.

## Risks

- A future contributor adding `Date.now()` or `Math.random()`. Mitigated by lint, which was
  verified to reject exactly that.
- Floating-point differences across platforms. Real, and mitigated by preferring integer
  arithmetic in resolution — the same discipline the economy already uses.

## Review conditions

- A replay ever disagrees with its recorded result → treat as a **critical** defect. The
  determinism guarantee is either true or worthless.
- The historical rule-set burden becomes unmanageable → define a replay window rather than
  abandoning versioning.

## Bootstrap status

Contract, versioning and seven written invariants exist, with tests asserting the contract
and a test that fails if gameplay symbols appear before the specification is approved.
**There is no combat logic**, and there will not be until the battle specification is written
and approved.
