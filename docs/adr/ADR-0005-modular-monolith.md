# ADR-0005: Modular monolith, not microservices

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

> The most consequential decision in this register. Everything about the data, event and
> deployment architecture follows from it.

## Context

Collection War has around twenty-one identified domains. Several of them — marketplace,
economy, owned creatures — must change together **atomically**: a purchase moves currency
and ownership, and there is no acceptable state in between.

The team is small. There are no users. There is no traffic. There is no operations function.

## Decision

**One deployable API process and one worker process**, built from a monorepo with strict,
lint-enforced internal module boundaries.

Modules are designed so that extraction into a service would be _possible_. **No module is
extracted.**

## Alternatives considered

**Microservices from the start.** Independent scaling and deployment, clear boundaries by
construction. Rejected for one decisive reason and several supporting ones:

> A marketplace purchase must move currency and ownership atomically. In one database that is
> a transaction. Across services it is a saga — with compensating actions, intermediate
> states, and an entire class of "the money moved but the item did not" bugs that **cannot
> occur** in the monolith.

Supporting reasons: distributed systems require distributed debugging, which costs real time
and buys nothing at zero traffic; and service boundaries drawn before the domain is
understood are drawn in the wrong places, where moving them is far harder than moving a
module.

**A monolith with no internal boundaries.** Simplest to write. Rejected: it becomes a mud
ball, and then extraction is impossible even when it is genuinely needed. The boundaries are
what make this decision reversible.

**Serverless functions.** Rejected: cold starts, connection-pool exhaustion against
PostgreSQL, and a poor fit for the transactional work that dominates this system.

**Modular monolith with a database per module.** Rejected: that is a service-boundary pattern
adopted inside a monolith — it gives up transactions while gaining none of the independence
that would justify the loss.

## Positive consequences

- **Transactions work.** The single largest correctness advantage, and the reason the economy
  rules are enforceable at all.
- One process to deploy, monitor, debug and roll back.
- A refactor across module boundaries is type-checked end to end.
- A stack trace crosses module boundaries.
- Near-zero infrastructure cost.
- Local development runs the whole system.

## Negative consequences

- **Everything scales together.** A CPU-heavy battle load also scales the parts that do not
  need it.
- **A crash takes everything down.** Mitigated by multiple stateless replicas.
- **Boundary erosion is a constant pressure**, and nothing physically prevents it. Mitigated
  by lint rules verified against deliberate violations, and by review.
- One deployment cadence for everything.
- The codebase grows large and eventually needs deliberate navigation.

## Risks

- **The primary risk is boundary decay.** A monolith whose boundaries have rotted cannot be
  extracted later, which forfeits the exit strategy that makes this decision safe. The
  mitigation is [module boundaries](../architecture/MODULE_BOUNDARIES.md), the extraction
  test, and treating a cross-module join as a review failure.
- A future workload with genuinely different scaling characteristics. The battle engine is
  the obvious candidate — and it is already pure and I/O-free, so moving it is a scheduling
  change rather than a rewrite.

## Review conditions

Extract a module **only when all of these hold**:

- a measured constraint requires it, not a prediction;
- the module's boundary has held in practice;
- it does not need to share a transaction with anything it would be split from;
- someone has agreed to carry the operational cost;
- a new ADR records the decision.

Also revisit if the team grows to the point where one deployment cadence is the bottleneck.
