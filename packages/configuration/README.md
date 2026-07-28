# Configuration — `@collection-war/configuration`

> **Status:** Implemented and tested (14 tests).

## Responsibility

Typed, validated environment configuration. **Fails fast and totally** at process start.

## Public interface

- `loadApiConfig(env?)` · `loadWorkerConfig(env?)`
- `redactConfig(config)` — safe to log
- `toFeatureFlags(config)` · `SAFE_DEFAULT_FLAGS`

## Allowed dependencies

- `@collection-war/shared-types`, `validation`
- Zod

## Forbidden dependencies

- Every other workspace package
- Any framework
- Reading files — configuration comes from the environment

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/configuration run build
pnpm --filter @collection-war/configuration run typecheck
pnpm --filter @collection-war/configuration run test
```

## Notes

- **No silent defaults for anything that matters.** A default port is convenient; a default JWT secret is a vulnerability, because it will ship.
- Production is additionally strict, and each rule is unit-tested: wildcard CORS rejected · TLS to the database required · **the example placeholder secret rejected**.
- Redaction is by key **pattern**, so a newly added secret is hidden by default. The opposite default leaks on every addition someone forgets.
- Feature flags **fail closed** — a resolution failure disables the feature rather than enabling it.

## Ownership

Backend + security.
