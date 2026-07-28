# API Client — `@collection-war/api-client`

> **Status:** Implemented and tested (17 tests).

## Responsibility

The **only** sanctioned path from a client application to the server. Web, admin and mobile all use it; none constructs a `fetch` by hand.

## Public interface

- `createApiClient(options)` → `ApiClient`
- `createSystemApi(client)` → `health()`, `readiness()`, `info()`
- Response schemas, which are **parsed**, never cast

## Allowed dependencies

- `@collection-war/shared-types`, `validation`
- Zod

## Forbidden dependencies

- `@collection-war/database`, `pg`, `ioredis`, `bullmq`, `drizzle-orm`
- NestJS, Fastify
- React — it is consumed by React Native and by Next.js alike

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/api-client run build
pnpm --filter @collection-war/api-client run typecheck
pnpm --filter @collection-war/api-client run test
```

## Notes

- Built on native `fetch` — one fewer dependency, one fewer supply-chain surface, no bundle cost for something the platform provides.
- **`fetch` is resolved per request, not captured at construction.** Client applications create their client at module scope, so capturing it once binds whatever existed at import time. That silently bypassed every test stub until it was fixed — there is now a regression test.
- **Tokens are resolved per request** by callback, so a refreshed token takes effect immediately rather than after a reload.
- `treatStatusAsSuccess: [503]` on `readiness()`: a 503 from `/ready` is a deliberate signal to load balancers, and its body carries exactly the dependency detail the caller asked for.
- **The client decides nothing.** It transports and parses.

## Ownership

Shared — web, mobile and admin all depend on it.
