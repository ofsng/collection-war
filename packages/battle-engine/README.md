# Battle Engine — `@collection-war/battle-engine`

> **Status:** **Contract and determinism machinery only (6 tests). No combat logic.**

## Responsibility

Deterministic, server-authoritative battle resolution. Same inputs plus same seed produce byte-identical output, on any machine, forever.

## Public interface

- `BattleInput`, `BattleResult`, `BattleEvent`, `BattleEngine`
- `BATTLE_ENGINE_VERSION`, `canReplay(version)`
- `BATTLE_ENGINE_INVARIANTS` — seven written guarantees

## Allowed dependencies

- `@collection-war/domain`, `shared-types`

## Forbidden dependencies

- Every framework and every storage client
- `Date.now()`, `Math.random()`
- Any I/O whatsoever — network, filesystem, database
- Iteration over a `Map`, `Set` or object key list where it affects the result

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/battle-engine run build
pnpm --filter @collection-war/battle-engine run typecheck
pnpm --filter @collection-war/battle-engine run test
```

## Notes

- `resolve()` is **synchronous by design**. An async signature would permit — and eventually attract — an `await` on a database inside resolution, which is exactly what must never happen.
- Iteration order is the most common way a "deterministic" engine quietly stops being one. It is listed as an invariant for that reason.
- A test fails if gameplay symbols are exported before the battle specification is approved.

## Ownership

Architecture + backend. A determinism failure is a **critical** defect.
