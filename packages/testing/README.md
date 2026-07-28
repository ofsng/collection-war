# Testing — `@collection-war/testing`

> **Status:** Implemented and tested (16 tests).

## Responsibility

Deterministic test doubles, builders and assertions. **Test-only** — never imported by production code.

## Public interface

- `createFakeIdempotencyStore()` · `createFakeUnitOfWork()` · `createFakeEventPublisher()`
- `testUuid(n)` · `createIdSequence(prefix)` · `testIdempotencyKey(label)`
- `expectOk` · `expectErr` · `expectErrorCode`

## Allowed dependencies

- `@collection-war/shared-types`

## Forbidden dependencies

- Being imported by any production code path
- Any framework

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/testing run build
pnpm --filter @collection-war/testing run typecheck
pnpm --filter @collection-war/testing run test
```

## Notes

- **The fakes enforce the same invariants as the real implementations.** A permissive fake makes tests pass against behaviour that would fail in production — confidence that is not earned. `createFakeIdempotencyStore` throws if a key is completed without being reserved, because skipping the reservation is precisely the bug that permits double execution.
- `createFakeUnitOfWork` records commits **and rollbacks**, so a test can assert that a failure rolled back rather than merely returned an error.
- Ids are deterministic and **syntactically valid UUIDs** — a fake id of `'1'` would be rejected by the very validation the test is meant to exercise.

## Ownership

QA.
