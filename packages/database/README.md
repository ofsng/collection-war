# Database — `@collection-war/database`

> **Status:** Client, transactions and health implemented (8 unit tests). Two platform tables. **No migration has ever been run.**

## Responsibility

PostgreSQL access. The **only** package permitted to know that SQL exists.

## Public interface

- `createDatabase(options)` → `{ db, pool, close }`
- `createUnitOfWork(db)` → `UnitOfWork` with isolation control and serialization retry
- `checkDatabaseHealth(db, timeoutMs)`
- `schema` — `outbox`, `idempotencyKeys`

## Allowed dependencies

- `@collection-war/domain`, `configuration`, `observability`, `shared-types`
- drizzle-orm, pg

## Forbidden dependencies

- React, Next.js, Expo, React Native
- `@collection-war/api-client`, `design-system`
- Exposing raw database access to a UI application

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/database run build
pnpm --filter @collection-war/database run typecheck
pnpm --filter @collection-war/database run test    # Unit tests only
pnpm --filter @collection-war/database run test:integration    # Gated — needs a reachable PostgreSQL
pnpm --filter @collection-war/database run db:generate    # Schema → reviewable SQL
pnpm --filter @collection-war/database run db:migrate
pnpm --filter @collection-war/database run db:seed    # Nothing to seed yet, and it says so
pnpm --filter @collection-war/database run db:studio
```

## Notes

- **`drizzle-kit push` is deliberately not wired to any script.** It applies a schema diff with no migration file, so the change is neither reviewable nor reproducible.
- `ssl: { rejectUnauthorized: true }` — `false` would accept any certificate, making TLS decorative. If a provider needs a custom CA, supply the CA.
- Serialization failures (`40001`) are **expected and normal** under `SERIALIZABLE`, not errors. The unit of work retries with jittered backoff.
- The pool has an `error` listener: without one, an idle client error is an unhandled event that terminates the process.
- **Integration tests are gated, not skipped.** A suite that silently skips produces a green run that tested nothing.

## Ownership

Backend + database reviewer.
