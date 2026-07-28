# Economy — `@collection-war/economy`

> **Status:** Primitives implemented and tested (30 tests). **No currencies, prices, fees or reward tables.**

## Responsibility

Exact integer money arithmetic, the double-entry ledger contract, and the executable economy invariants.

## Public interface

- `money`, `add`, `subtract`, `spend`, `multiply`, `applyBasisPoints`, `split`, `compare` — all returning `Result`
- `LedgerEntry`, `LedgerTransfer`, `LedgerRepository`, `AccountType`
- `checkTransfer`, `assertBalanced`, `checkConservation`, `checkIdempotencyKeyUniqueness`, …

## Allowed dependencies

- `@collection-war/domain`, `shared-types`

## Forbidden dependencies

- Every framework and every storage client
- Any UI concern
- **Floating-point arithmetic**
- Any operation that assigns a balance

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/economy run build
pnpm --filter @collection-war/economy run typecheck
pnpm --filter @collection-war/economy run test
```

## Notes

- **`assertBalanced` refuses to write an unbalanced transfer.** Once written, entries are append-only and can only be compensated, never removed.
- `split` distributes its remainder so the parts sum **exactly** to the original — 100 split three ways is [34, 33, 33], not a lost unit.
- `applyBasisPoints` floors explicitly. The rounding rule must be a stated decision, not whatever IEEE-754 happened to do.
- **When you find a new failure mode, add the invariant.** A rule in a document is a hope; a rule that fails a build is a rule.

## Ownership

**Economy reviewer — mandatory for every change.**
