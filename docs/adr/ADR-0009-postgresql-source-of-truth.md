# ADR-0009: PostgreSQL as the single source of truth

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Collection War's correctness rests on operations that must be atomic across several kinds of
data. A marketplace purchase moves currency, transfers ownership, closes a listing, writes
ledger entries and enqueues an event — all or nothing.

The economy additionally requires an append-only ledger that can be summed, reconciled and
audited years later.

## Decision

**PostgreSQL 17 holds all durable state.** One database, one source of truth.

Redis is a cache and a queue and is **never** authoritative for anything a player owns.

## Alternatives considered

**MySQL / MariaDB.** Capable and widely deployed. Rejected on specifics rather than
generalities: weaker `jsonb` support (the outbox payload), no partial indexes (the
soft-delete pattern), and a less mature `SERIALIZABLE` implementation — which is exactly the
feature the economy depends on.

**MongoDB or another document store.** Flexible schema, easy horizontal scaling. Rejected
decisively: multi-document transactions exist but are a bolt-on, and the data here is deeply
relational — players own creatures, creatures reference species, listings reference
creatures, ledger entries reference accounts. Modelling that in documents means either
duplication or application-level joins, and both make the economy invariants unenforceable.

**PostgreSQL plus a separate ledger store.** Specialised ledger databases exist. Rejected:
it reintroduces exactly the cross-system atomicity problem the monolith was chosen to avoid.
The ledger must commit with the ownership transfer.

**SQLite.** Excellent for local development. Rejected: no meaningful concurrency for the
write patterns here, and using a different engine locally than in production means local
testing does not test the real behaviour.

## Positive consequences

- **Transactions across everything.** The foundation the economy rules rest on.
- `SERIALIZABLE` isolation for the operations whose invariants span rows —
  see [data architecture](../architecture/DATA_ARCHITECTURE.md).
- `jsonb` where flexibility is genuinely needed (outbox payloads, audit summaries) without
  giving up relational integrity elsewhere.
- Partial indexes, which make the soft-delete pattern cheap.
- Foreign keys and constraints as real correctness guarantees, not conventions.
- Every managed hosting provider offers it.

## Negative consequences

- **Vertical scaling first.** Horizontal write scaling requires partitioning or sharding,
  both of which are significant work.
- **The database is the bottleneck**, as in almost every system of this shape.
- Connection limits require a pool, and eventually a pooler.
- `SERIALIZABLE` produces serialization failures under contention. These are **expected and
  normal**, and the unit of work retries them with jittered backoff — but the code must be
  written knowing that.
- Schema changes need migrations and care.

## Risks

- Write volume outgrowing one instance. Distant, and addressed in
  [scaling strategy](../architecture/SCALING_STRATEGY.md) in a defined order: indexes →
  queries → replicas → partitioning.
- `ledger_entries` and `audit_records` grow without bound. Mitigated by time partitioning and
  archival — never by deletion.

## Review conditions

- Sustained database CPU above 70% after query and index work → read replicas.
- Write volume genuinely exceeding one instance → partition the largest append-only tables
  first.
- Any proposal to move player-owned state out of PostgreSQL requires a new ADR.
