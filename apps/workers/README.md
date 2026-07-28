# Workers — `@collection-war/workers`

> **Status:** Lifecycle only. **Zero job processors registered**, deliberately.

## Responsibility

Background processing: the outbox relay, scheduled state changes, notification delivery, analytics forwarding. A separate process from the API so a long job never competes with request handling, and a crashing job never takes down request serving.

## Public interface

- No HTTP surface, and therefore no HTTP attack surface.
- Consumes BullMQ queues: `outbox-relay`, `notifications`, `scheduled`, `analytics`, `maintenance` — all **declared, none served**.

## Allowed dependencies

- `@collection-war/domain`, `economy`
- `@collection-war/database`
- `@collection-war/configuration`, `observability`, `shared-types`
- BullMQ, ioredis

## Forbidden dependencies

- `@collection-war/api-client`
- React, Next.js, Expo, React Native
- Anything presentational

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/workers run dev    # Watch mode
pnpm --filter @collection-war/workers run build    # `tsc`
pnpm --filter @collection-war/workers run start    # Run the built output
pnpm --filter @collection-war/workers run typecheck
pnpm --filter @collection-war/workers run test    # Unit tests (12)
```

## Notes

- `maxRetriesPerRequest: null` is **mandatory** for BullMQ. Its blocking commands legitimately wait a long time; with a retry cap, ioredis aborts them and BullMQ reports spurious connection errors.
- Graceful shutdown is not a nicety: a worker killed mid-job can be terminated between debiting gold and crediting inventory — the exact state the transactional design exists to prevent.

## Ownership

Backend.
