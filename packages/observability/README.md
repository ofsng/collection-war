# Observability — `@collection-war/observability`

> **Status:** Implemented and tested (11 tests).

## Responsibility

Structured logging, secret redaction and correlation-id propagation. The **only** sanctioned way for server code to log.

## Public interface

- `createLogger(options)` → `Logger` · `createSilentLogger()`
- `redactDeep(value)` · `maskConnectionString(value)` · `REDACTED_PATHS`
- `resolveCorrelationId(header)` · `newCorrelationId()` · `CORRELATION_ID_HEADER`

## Allowed dependencies

- `@collection-war/shared-types`
- Pino, pino-pretty

## Forbidden dependencies

- Every other workspace package
- Any framework

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/observability run build
pnpm --filter @collection-war/observability run typecheck
pnpm --filter @collection-war/observability run test
```

## Notes

- **Redaction is deny-by-default, by key pattern.** Every leaked-credential incident ends the same way: nobody meant to log it. Pattern matching protects a new secret before anyone remembers to add it to a list.
- `redactDeep` is depth-bounded, so a cyclic structure cannot hang a logging call and take the request down with it.
- `resolveCorrelationId` validates an incoming header before use — it is written into log lines, so an unvalidated value is a log-injection vector.
- **Message strings must be constant**; variable data goes in the context, or logs cannot be grouped or alerted on.

## Ownership

Backend + security.
