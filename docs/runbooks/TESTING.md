# Runbook: Testing

> Audience: everyone. Date: 2026-07-28.

---

## `pnpm verify` — the gate

```bash
pnpm verify
```

Runs, in order: `format:check` → `lint` → `typecheck` → `test` → `build`.

**Every stage runs even if an earlier one fails**, so one run surfaces every problem instead
of forcing a fix-one-rerun loop. The exit code is non-zero if any stage failed — there is no
"mostly passed".

**A green `verify` is the minimum bar for calling work complete.** A claim of completion
without one is not accepted, from a human or an agent. See
[AI agent rules](../constitution/AI_AGENT_RULES.md).

### What it deliberately does not run

`test:integration` and `test:e2e` need running infrastructure and browsers. Including them
would make the gate fail for reasons unrelated to the change — and a gate people learn to
ignore is worse than no gate.

```bash
pnpm infra:up && pnpm test:integration
pnpm exec playwright install && pnpm test:e2e
```

---

## The test pyramid, and what belongs where

| Level           | Runs against                 | Speed           | Use for                                       |
| --------------- | ---------------------------- | --------------- | --------------------------------------------- |
| **Unit**        | Fakes, in memory             | ms              | Business rules, invariants, pure functions    |
| **Integration** | Real PostgreSQL and Redis    | seconds         | Transactions, isolation, constraints, queries |
| **E2E**         | A running stack in a browser | tens of seconds | A few critical user journeys                  |

**Most tests should be unit tests**, and the architecture is arranged to make that possible:
domain packages have no I/O, so economy invariants and battle determinism are unit-testable.

**Integration tests exist for what unit tests cannot prove** — that `SERIALIZABLE` actually
prevents the double sale, that the unique index actually rejects the duplicate key. Those are
claims about PostgreSQL, and only PostgreSQL can settle them.

---

## What must be tested

### Always

- Every economy operation: success, insufficient funds, **retry**, **concurrent access**.
- Every authorization path: unauthenticated, wrong role, **not the owner**.
- Every state machine transition, including the invalid ones.
- Every error path a client will actually hit.
- Battle determinism: same seed, same result.
- Localization completeness — already a failing test.

### The tests that matter most

Not the ones with the highest coverage. The ones that would have caught a real incident:

```ts
it('rejects a transfer that creates value out of nothing');
it('refuses to overdraw a balance');
it('returns the original result when a purchase is retried');
it('does not sell one listing to two concurrent buyers');
it('never returns an internal message or stack trace to the client');
it('produces an identical sequence for an identical seed');
```

---

## Writing a good test

**Name the behaviour, not the implementation.**

```ts
it('refuses to overdraw a balance'); // good
it('calls checkBalance() before deduct()'); // bad — breaks on every refactor
```

**Test the boundary, not the internals.** A test that breaks whenever the code is
reorganised is a cost, not a safety net.

**Assert on absence where it matters.** Several of the most valuable tests in this repository
assert that something is _not_ present:

```ts
expect(JSON.stringify(result.error)).not.toContain('hunter2-secret-value');
expect(serialized).not.toContain('postgresql://');
```

**Use deterministic fakes.** `createFixedClock`, `createSeededRandom`,
`createFakeIdempotencyStore` — all in `@collection-war/testing`. A test using real time or
real randomness is a test that will be flaky and then be deleted.

---

## Where tests live

```text
packages/<pkg>/src/*.test.ts               unit
packages/database/src/*.integration.test.ts  integration (excluded from `pnpm test`)
apps/api/src/**/*.test.ts                  unit, by direct construction
apps/web/src/**/*.test.tsx                 component, jsdom
apps/web/e2e/*.spec.ts                     Playwright
```

### API tests use direct construction, not the Nest container

Vitest transforms TypeScript with esbuild, which does not emit the `design:paramtypes`
metadata Nest's injector reads. Booting the container under Vitest would need an extra SWC
layer.

Since every controller and service is a plain class with an explicit constructor, direct
construction tests the same logic with one fewer moving part — and makes each unit's
dependencies visible in the test itself.

---

## Running tests

```bash
pnpm test                                        # all unit tests
pnpm --filter @collection-war/economy test       # one package
pnpm --filter @collection-war/economy exec vitest        # watch mode
pnpm --filter @collection-war/economy exec vitest --ui   # UI
pnpm exec vitest run -t "refuses to overdraw"    # by name
```

---

## Integration tests

**Gated, not skipped.** `require-database.mjs` checks that PostgreSQL is reachable and exits
non-zero with an explanation if it is not.

That is deliberate: a suite that silently skips produces a green run that tested nothing,
which is the outcome this project's completion standard forbids.

```bash
pnpm infra:up
pnpm test:integration
```

> **These have never been run.** Docker was unavailable during the bootstrap. See
> [risks](../status/RISKS.md).

---

## Current state

| Suite               | Tests     | Status                                  |
| ------------------- | --------- | --------------------------------------- |
| Package unit tests  | 167       | ✅ passing                              |
| API unit tests      | 28        | ✅ passing                              |
| Web component tests | 13        | ✅ passing                              |
| Admin tests         | 4         | ✅ passing                              |
| Mobile logic tests  | 13        | ✅ passing                              |
| Worker tests        | 12        | ✅ passing                              |
| **Integration**     | 6 written | ⚠️ **never executed** — needs Docker    |
| **E2E**             | 0         | ⚠️ harness configured, no tests written |

Coverage is deliberately not reported as a percentage. It is a diagnostic, not a target —
load-bearing code is tested exhaustively, a layout component is not.

Related: [Local development](LOCAL_DEVELOPMENT.md) ·
[Engineering principles](../constitution/ENGINEERING_PRINCIPLES.md#11-tests-describe-behaviour-not-implementation)
