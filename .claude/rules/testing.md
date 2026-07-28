# Rule: Testing

**Canonical:** [TESTING.md](../../docs/runbooks/TESTING.md) ·
[ENGINEERING_PRINCIPLES.md](../../docs/constitution/ENGINEERING_PRINCIPLES.md#11-tests-describe-behaviour-not-implementation)

---

## The gate

```bash
pnpm verify
```

format → lint → typecheck → test → build. **A green `verify` is the minimum bar for calling
work complete.**

Integration and E2E are excluded deliberately — they need infrastructure, and a gate that
fails for unrelated reasons is a gate people learn to ignore.

## Never weaken a check to make it pass

No skipped tests. No loosened assertions. No `eslint-disable`. No cast to `any`.

If a check is wrong, **say so**. That is a finding, not an obstacle.

## Name the behaviour, not the implementation

```ts
it('refuses to overdraw a balance'); // good
it('calls checkBalance() before deduct()'); // bad — breaks on every refactor
```

## Always test

- Economy: success · insufficient funds · **retry** · **concurrent access**
- Authorization: unauthenticated · wrong role · **not the owner**
- Every error path a client will hit
- Battle determinism: same seed, same result
- **Absence** where it matters — that a secret is _not_ in an error, that a stack trace is
  _not_ returned

## Use deterministic fakes

`createFixedClock` · `createSeededRandom` · `createFakeIdempotencyStore` ·
`createFakeUnitOfWork` — in `@collection-war/testing`.

A test using real time or real randomness is a test that will be flaky and then deleted.

## Integration tests are gated, not skipped

`require-database.mjs` exits non-zero with an explanation when PostgreSQL is unreachable. A
suite that silently skips produces a green run that tested nothing.

## Current state

167 package tests · 28 API · 13 web · 4 admin · 13 mobile · 12 worker — **all passing**.

**Integration: 6 written, never executed** (needs Docker).
**E2E: harness configured, zero tests written.**
