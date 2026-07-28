# ADR-0014: Framework-independent shared domain packages

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Business rules — how a battle resolves, whether a purchase is affordable, whether a ledger
transfer balances — must be testable, reusable and durable.

If they live inside NestJS controllers, they can only be tested through HTTP, can only be
reused by the API, and die with the framework. If they live inside React components, worse.

## Decision

**Business logic lives in framework-free packages** that the applications depend on, never
the reverse:

```text
packages/domain          repository interfaces, events, outbox, unit of work, clock, random
packages/battle-engine   deterministic resolution
packages/economy         money arithmetic, ledger contract, invariants
```

These packages may import only `@collection-war/shared-types` and each other. **No React, no
Next, no Expo, no NestJS, no Fastify, no pg, no Redis, no ORM.**

Repository interfaces are declared **by the domain** and implemented **by the database
package** — dependency inversion.

Packages compile to **CommonJS** so that NestJS (CJS), Next.js and Metro can all consume them
without ESM/CJS interop problems.

### Enforcement

`no-restricted-imports` rules per layer in `eslint.config.mjs`, **verified by deliberately
introducing violations and confirming each was rejected**.

> `eslint-plugin-boundaries` was tried first and removed. In a pnpm workspace every
> cross-layer import is a package specifier, and the plugin could not map those back to local
> elements without an import resolver — so it reported nothing while appearing to work. A
> boundary rule that silently passes is worse than no rule, because it is trusted.

## Alternatives considered

**Logic inside NestJS services.** Conventional and simpler. Rejected: it couples every rule
to the framework, makes tests require the DI container, and prevents workers from reusing the
same logic without an HTTP call.

**One shared package containing everything.** Rejected: no internal structure, and it would
become the dumping ground the shared kernel is explicitly protected from becoming.

**Hexagonal architecture with formal ports and adapters everywhere.** Rejected as too
ceremonious for this size. The inward dependency rule captures most of the benefit at a
fraction of the cost.

## Positive consequences

- **Domain logic is tested in milliseconds with no database** — 167 package tests run in
  seconds.
- The battle engine is pure, so it is deterministic and parallelisable.
- Economy invariants are unit tests, not integration tests.
- Swapping Drizzle, or moving a table, touches one package.
- The same logic serves the API and the workers without duplication.

## Negative consequences

- More packages, more `package.json` files, more build steps.
- A build ordering requirement: packages must compile before applications typecheck.
  Turborepo handles this, but a stale `dist/` produces confusing errors.
- Dependency inversion is indirection, and indirection has a comprehension cost.
- CommonJS output forgoes some modern tooling benefits, and is a deliberate compatibility
  choice rather than a preference.

## Risks

- **Boundary erosion.** Nothing physically prevents a domain package importing the ORM.
  Mitigated by lint rules that were _tested_ rather than assumed.
- Over-abstraction: interfaces created for things that will only ever have one
  implementation. The guard is to invert a dependency only where the domain genuinely must
  not know the detail.

## Review conditions

- A lint rule proves not to fire for a violation it should catch → treat as a defect, not a
  configuration preference.
- The ESM ecosystem settles to the point where CommonJS output is a liability → revisit the
  module format.
