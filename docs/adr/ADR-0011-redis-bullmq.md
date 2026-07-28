# ADR-0011: Redis and BullMQ for cache and queues

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

The system needs background job processing (outbox relay, scheduled state, notifications),
caching, and rate-limit counters.

It does **not** need a distributed streaming platform. There is no traffic, and every message
this system will produce for a long time fits comfortably in one Redis instance.

## Decision

**Redis 7 for cache, rate limiting and queue backing. BullMQ 5.81.2 as the queue library.**

Redis is configured with `appendonly yes` — so queued jobs survive a restart — and
`maxmemory-policy noeviction`, so a full Redis fails loudly instead of silently discarding
jobs.

**Redis is never the source of truth for player-owned state.**

## Alternatives considered

**PostgreSQL-backed queues (pg-boss, or a hand-rolled table).** One fewer piece of
infrastructure, and jobs would be transactional with business data. Genuinely appealing.
Rejected because polling a table for jobs adds sustained load to the component that is
already the bottleneck ([ADR-0009](ADR-0009-postgresql-source-of-truth.md)), and BullMQ's
scheduling, retry, rate-limiting and observability would all have to be reimplemented.

Note that the **outbox** deliberately _is_ PostgreSQL-backed — because it must be
transactional with the business change. The two choices are consistent: transactional
delivery in the database, work scheduling in Redis.

**RabbitMQ.** Mature and feature-rich. Rejected: a heavier operational surface for capability
not needed at this scale.

**Kafka.** Rejected outright. Correct for event streaming at volume; enormously
disproportionate here, and named explicitly as a [non-goal](../product/NON_GOALS.md).

**Cloud-managed queues (SQS, Cloud Tasks).** Rejected: provider lock-in, and they cannot run
locally, which breaks the "local development is real" principle.

## Positive consequences

- One dependency serves cache, rate limiting and queues.
- BullMQ provides retries, exponential backoff, delayed jobs, repeatable jobs, priorities and
  concurrency control out of the box.
- Runs locally in Docker Compose exactly as it would in production.
- Every provider offers managed Redis.
- Very low latency for cache reads.

## Negative consequences

- **A second stateful component to operate**, monitor and back up.
- Redis is in-memory, so capacity is bounded by RAM and eviction policy matters. `noeviction`
  means a full instance rejects writes — chosen deliberately, because silently dropping a
  queued job is worse than an error.
- Jobs are **not** transactional with the database. This is precisely why the outbox exists:
  the event is written to PostgreSQL in the business transaction, and only _then_ relayed.
- BullMQ requires `maxRetriesPerRequest: null`, which is unintuitive: its blocking commands
  legitimately wait a long time, and a retry cap makes ioredis abort them and report spurious
  connection errors.

## Risks

- **Redis data loss.** Mitigated structurally: nothing a player owns lives there. A Redis
  restart is an availability event, never a data-loss event. Losing queued jobs is
  recoverable because the outbox — in PostgreSQL — is the durable record.
- Memory exhaustion under unexpected load. Mitigated by bounded job retention
  (`removeOnComplete: { count: 1000 }`) rather than `false`, which would grow until the
  instance died.
- BullMQ's optional native `msgpackr-extract` acceleration is blocked by
  `onlyBuiltDependencies`. It falls back to pure JavaScript, which is correct and slightly
  slower — an acceptable default for a supply-chain reason.

## Review conditions

- Queue throughput exceeds what one Redis instance handles → evaluate clustering before
  changing technology.
- A need arises for durable, replayable event streams with long retention → that is a
  different problem, and would need its own ADR.
