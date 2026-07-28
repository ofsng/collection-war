# Web — `@collection-war/web`

> **Status:** Health screen and locale switching. **Builds and tested (13 tests).** No game screens.

## Responsibility

The player-facing web client. Renders and requests. **Decides nothing.**

## Public interface

- `/` — the system status screen, which exists to prove a browser can reach the API through the shared client.

## Allowed dependencies

- `@collection-war/api-client`
- `@collection-war/design-system`, `localization`, `shared-types`, `validation`, `analytics-events`
- Next.js, React, TanStack Query, react-hook-form, zod

## Forbidden dependencies

- `@collection-war/database`, `pg`, `ioredis`, `bullmq`, `drizzle-orm` — a bundler follows imports, and this is how credentials leak into a client bundle
- NestJS, Fastify

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/web run dev    # :3000
pnpm --filter @collection-war/web run build    # `next build`
pnpm --filter @collection-war/web run start
pnpm --filter @collection-war/web run typecheck
pnpm --filter @collection-war/web run test    # Component tests (13)
pnpm --filter @collection-war/web run test:e2e    # Playwright — no tests written yet
```

## Notes

- The `QueryClient` is created inside `useState`, **never at module scope**. A module-level client is shared across every request during server rendering, which means one player's cached data can be served to another.
- Locale is resolved **server-side** from the cookie and `Accept-Language`, so `<html lang>` and the first paint are already correct — no post-hydration flash.
- `export const dynamic = 'force-dynamic'` at the root layout, because it reads `cookies()` and `headers()`.

## Ownership

Web. Accessibility and localization are not a later pass.
