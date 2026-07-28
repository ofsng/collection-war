# Admin — `@collection-war/admin`

> **Status:** **A route guard that denies everything**, with a test asserting it. No authentication exists.

## Responsibility

The administration console: support, moderation, economy oversight, feature flags, content publishing. **None of it implemented.**

## Public interface

- `/` — the guarded landing page, which currently renders only the "not authenticated" notice and a health panel.

## Allowed dependencies

- `@collection-war/api-client`
- `@collection-war/design-system`, `localization`, `shared-types`
- Next.js, React, TanStack Query

## Forbidden dependencies

- `@collection-war/database`, `pg`, `ioredis`, `bullmq`, `drizzle-orm`
- NestJS, Fastify

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/admin run dev    # :3001
pnpm --filter @collection-war/admin run build
pnpm --filter @collection-war/admin run start
pnpm --filter @collection-war/admin run typecheck
pnpm --filter @collection-war/admin run test    # Guard tests (4)
```

## Notes

- Hardened beyond the web app: `frame-ancestors 'none'` so it cannot be embedded in a clickjacking page, plus `no-store` and `noindex`.
- **Guards run on the server**, in a server component, before protected content is rendered. Hiding content with CSS is not access control.
- `getAdminSession()` returns `null`, so `requireAdmin` denies every role. **Do not add a placeholder session** — a fake login that works gets forgotten and ships. There is a test that will fail if you do.

## Ownership

Web + security. Any change here is a privilege change.
