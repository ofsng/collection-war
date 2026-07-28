# API — `@collection-war/api`

> **Status:** Health, readiness and system info. **Verified running over HTTP.** No game endpoints.

## Responsibility

The **only authority** in Collection War. Every business decision and every write happens here. Nothing else is permitted to decide anything that affects persistent state.

## Public interface

- `GET /health` — liveness. Touches **nothing** external, so a database outage cannot cause a restart loop.
- `GET /ready` — readiness. Checks dependencies; returns **503** when one is down.
- `GET /api/v1/system/info` — non-sensitive service identity.
- `GET /docs` — OpenAPI UI, **non-production only**.

## Allowed dependencies

- `@collection-war/domain`, `battle-engine`, `economy`
- `@collection-war/database`
- `@collection-war/configuration`, `observability`, `validation`, `shared-types`, `localization`
- NestJS, Fastify, ioredis, zod

## Forbidden dependencies

- `@collection-war/api-client` — the API does not call itself over HTTP
- React, Next.js, Expo, React Native
- `@collection-war/design-system`

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/api run dev    # Watch mode on :4000
pnpm --filter @collection-war/api run build    # `nest build`
pnpm --filter @collection-war/api run start    # Run the built output
pnpm --filter @collection-war/api run typecheck
pnpm --filter @collection-war/api run test    # Unit tests (28)
pnpm --filter @collection-war/api run test:integration    # Needs running infrastructure
```

## Notes

- **Do not convert a constructor-parameter import to `import type`.** NestJS reads `design:paramtypes` metadata; a type-only import is erased and the dependency arrives `undefined` at runtime. `@typescript-eslint/consistent-type-imports` is off for this app for exactly that reason.
- **Tests construct classes directly**, not through the Nest container — Vitest's esbuild transform does not emit decorator metadata. See [TESTING.md](../../docs/runbooks/TESTING.md).
- Configuration is validated **before** anything else is constructed, so an invalid environment kills the process rather than binding a port.

## Ownership

Backend. Any change touching value additionally requires an [economy review](../../.claude/agents/economy-reviewer.md).
