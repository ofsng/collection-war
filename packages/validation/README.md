# Validation — `@collection-war/validation`

> **Status:** Implemented and tested (8 tests).

## Responsibility

Runtime schema validation at every trust boundary. **Parse, don't validate** — take `unknown`, return a typed value or an error.

## Public interface

- `parseWith(schema, input)` → `Result`
- `parseOrThrow(schema, input, context)` — for startup config, where there is no caller to return to
- Reusable primitives: `uuidSchema`, `isoTimestampSchema`, `minorUnitsSchema`, `displayNameSchema`, …

## Allowed dependencies

- `@collection-war/shared-types`
- Zod

## Forbidden dependencies

- Every other workspace package
- Any framework

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/validation run build
pnpm --filter @collection-war/validation run typecheck
pnpm --filter @collection-war/validation run test
```

## Notes

- **A validation error never echoes the rejected input.** That is how passwords reach logs and error trackers. There is a test asserting it.
- `minorUnitsSchema` rejects fractional amounts. In a ledger, a rounding error is real value appearing or disappearing.
- `displayNameSchema` is Unicode-aware — a filter allowing only `[a-z]` would reject most Turkish names.

## Ownership

Backend + security.
