# Shared Types — `@collection-war/shared-types`

> **Status:** Implemented and in use everywhere.

## Responsibility

The **shared kernel** — the only vocabulary every module may agree on. Branded ids, `Money`, time, locale, `Result`, errors, audit metadata, content versions.

## Public interface

- Types and a handful of trivial constructors. See [SHARED_KERNEL.md](../../docs/domains/SHARED_KERNEL.md) for the admission test a new type must pass.

## Allowed dependencies

- **Nothing.** Zero runtime dependencies, and it must stay that way — it is imported by everything.

## Forbidden dependencies

- Every other package
- Zod (that is `validation`)
- Anything with behaviour beyond trivial construction
- Anything one domain owns — a `Creature` belongs to its domain, not here

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/shared-types run build
pnpm --filter @collection-war/shared-types run typecheck
pnpm --filter @collection-war/shared-types run test
```

## Notes

- **Every addition raises the coupling of the entire system.** A type belongs here only if three unrelated domains need it, it has no behaviour, it has no framework dependency, and changing it will be rare.
- A shared kernel that grows becomes a second, worse domain layer that nobody dares change.

## Ownership

Architecture. A change here is an architecture change.
