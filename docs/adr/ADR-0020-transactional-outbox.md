# ADR-0020: Transactional outbox from day one

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Business operations must both commit a database transaction and cause side effects. A
marketplace purchase moves currency and ownership, and then must notify the seller, update
quest progress and record analytics.

The database and the notification system are different systems with no shared transaction.
Whichever is done second can fail after the first has succeeded:

- **Publish first** → the transaction rolls back, and the seller is told they sold something
  they still own.
- **Commit first** → the process dies, and nobody is ever notified.

Both are real failures that occur the first time a process restarts at the wrong moment.

## Decision

**Domain events are written to an `outbox` table inside the business transaction.** A relay
process reads pending rows and delivers them afterwards.

The event exists **if and only if** the business change committed.

Design details, each with a reason:

- **Retry with exponential backoff and full jitter** (8 attempts, 1s base, 1h cap). Jitter is
  not a refinement: without it, every message that failed during an outage retries at the same
  instant when the dependency recovers, and the recovery is immediately undone.
- **Dead-letter after `maxAttempts`** rather than dropping or retrying forever. Dropping loses
  a business fact; infinite retry turns one broken message into a saturated relay.
- **At-least-once delivery**, so every consumer must be idempotent.

**The table was created before any domain table.** Retrofitting reliable delivery onto a
system that already fires side effects inline is a rewrite, not a refactor.

## Alternatives considered

**Publish directly after committing.** Simplest, and what most systems do at first. Rejected:
it is exactly the "commit first" failure above. Silent, occasional, and impossible to detect
after the fact.

**Two-phase commit / distributed transactions.** Correct in principle. Rejected: XA support
is poor or absent across the systems involved, it is operationally fragile, and it introduces
blocking failure modes.

**Change data capture (Debezium and similar).** Genuinely elegant — read the WAL and derive
events with no application involvement. Rejected: it adds Kafka or an equivalent, an explicit
[non-goal](../product/NON_GOALS.md), and it derives events from row changes rather than from
business intent, which is a weaker model.

**Accept the inconsistency.** Rejected. In a system with a real economy, "the sale committed
but the seller was never paid" is not an acceptable eventual outcome.

## Positive consequences

- **Side effects can never fire for a transaction that rolled back**, and can never be lost
  for one that committed.
- Events survive a process crash, because they are rows.
- Retries, backoff and dead-lettering are handled once, uniformly.
- The outbox is a queryable audit of everything that happened, which is valuable during an
  incident.
- No message broker required.

## Negative consequences

- **Latency.** An event is delivered after the transaction commits and after the relay picks
  it up — not instantly. Acceptable for notifications; unacceptable for anything the caller
  needs, which is why [module boundaries](../architecture/MODULE_BOUNDARIES.md) has a decision
  procedure for event-versus-direct-call.
- **Every consumer must be idempotent.** A real, permanent constraint on how handlers are
  written.
- Polling adds load to PostgreSQL — the component that is already the bottleneck.
- A single relay is a throughput ceiling until `SELECT … FOR UPDATE SKIP LOCKED` is used.
- Outbox rows need pruning after publication.

## Risks

- **Relay lag under load.** Mitigated by monitoring lag as a first-class metric, and by the
  documented path to multiple relays.
- A consumer that is not idempotent duplicating an effect. Mitigated by the requirement being
  stated in the interface documentation, and by idempotency keys on economy operations.
- Polling cost. Mitigated by a composite index on `(status, next_attempt_at)` so the scan
  touches only pending rows.

## Review conditions

- Outbox lag exceeds 10 seconds sustained → move to multiple relays with `SKIP LOCKED`.
- Polling load becomes measurable on the database → evaluate `LISTEN`/`NOTIFY` to reduce it.
- Event volume genuinely exceeds what PostgreSQL can relay → that is a different problem, and
  needs its own ADR.
