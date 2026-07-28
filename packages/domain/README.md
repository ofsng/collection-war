# Domain — `@collection-war/domain`

> **Status:** Structural contracts implemented and tested (15 tests). **No game logic.**

## Responsibility

The innermost layer: repository interfaces, domain events, the outbox contract, unit of work, and the deterministic clock and random source.

## Public interface

- `Clock` implementations: `createSystemClock`, `createFixedClock`
- `RandomSource`: `createSeededRandom`, `deriveSeed`
- `DomainEvent`, `DomainEventPublisher`, `DomainEventHandler`
- `OutboxRepository`, `nextRetryDelayMs`, `DEFAULT_OUTBOX_RETRY_POLICY`
- `ReadRepository`, `WriteRepository`, `IdempotencyRepository`
- `UnitOfWork`, `TransactionContext`, `SERIALIZABLE_OPERATIONS`
- `DomainErrors`

## Allowed dependencies

- `@collection-war/shared-types`

## Forbidden dependencies

- **Every framework** — React, Next, Expo, NestJS, Fastify
- **Every storage client** — pg, ioredis, bullmq, drizzle-orm
- `@collection-war/database`, `api-client`, `design-system`
- `Date.now()` and `Math.random()` — except in the two audited files that implement the abstractions

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/domain run build
pnpm --filter @collection-war/domain run typecheck
pnpm --filter @collection-war/domain run test
```

## Notes

- **Repository interfaces are declared here and implemented in `database`.** That inversion is what lets domain logic be tested against in-memory fakes with no database at all.
- `WriteRepository` has **no hard-delete method** — that is the soft-delete rule expressed in the type system rather than in a comment.
- Outbox backoff uses **full jitter**: without it, every message that failed during an outage retries at the same instant on recovery and immediately undoes it.

## Ownership

Architecture + backend.
