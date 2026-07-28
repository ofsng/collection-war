# Dependency Rules

> **Enforced by `eslint.config.mjs`, and verified to fire.** Audience: everyone.
> Date: 2026-07-28.

---

## The rule

**Dependencies point inward. Never outward, never sideways across layers.**

```text
┌─────────────────────────────────────────────────────┐
│ apps/  web · admin · mobile · api · workers         │  may import ↓
├─────────────────────────────────────────────────────┤
│ adapters/  api-client · design-system · database    │  may import ↓
├─────────────────────────────────────────────────────┤
│ domain/  domain · battle-engine · economy           │  may import ↓
├─────────────────────────────────────────────────────┤
│ leaf/  shared-types · validation · localization ·   │  imports nothing
│        configuration · observability ·              │  from above
│        analytics-events · testing                   │
└─────────────────────────────────────────────────────┘
```

---

## The matrix

| From ↓ / May import →                | web/admin/mobile | api/workers | api-client | design-system | database | domain layer |  leaf  |
| ------------------------------------ | :--------------: | :---------: | :--------: | :-----------: | :------: | :----------: | :----: |
| **web / admin / mobile**             |      ✅ own      |     ❌      |     ✅     |      ✅       |    ❌    |      ✅      |   ✅   |
| **api / workers**                    |        ❌        |   ✅ own    |     ❌     |      ❌       |    ✅    |      ✅      |   ✅   |
| **api-client**                       |        ❌        |     ❌      |   ✅ own   |      ❌       |    ❌    |      ✅      |   ✅   |
| **design-system**                    |        ❌        |     ❌      |     ❌     |    ✅ own     |    ❌    |      ✅      |   ✅   |
| **database**                         |        ❌        |     ❌      |     ❌     |      ❌       |  ✅ own  |      ✅      |   ✅   |
| **domain / battle-engine / economy** |        ❌        |     ❌      |     ❌     |      ❌       |    ❌    |    ✅ own    |   ✅   |
| **leaf packages**                    |        ❌        |     ❌      |     ❌     |      ❌       |    ❌    |      ❌      | ✅ own |

---

## Why each rule exists

### Client applications must not import `database`, `pg`, `ioredis`, `bullmq` or `drizzle-orm`

A bundler follows imports. An import of `@collection-war/database` from a client pulls a
connection string and a database driver into a bundle that ships to a player's device.

This is not hypothetical: it is one of the most common ways credentials leak from
JavaScript applications.

### Server applications must not import `api-client`, React, Next or Expo

The API _is_ the server. Calling itself through the client SDK means an HTTP round trip
where a function call would do, plus a serialization boundary in the middle of a transaction.

React and Expo in a server process are dead weight in the image and a signal that a
rendering concern has leaked into the authority.

### Domain packages must not import any framework, transport or storage

This is the load-bearing rule. Because the domain has no I/O:

- battle logic is testable in milliseconds with no database;
- economy invariants run in a unit test, not an integration suite;
- swapping Drizzle, or moving a table, touches one package;
- domain code cannot accidentally depend on SQL semantics, because it cannot see them.

The moment a domain package imports the ORM, all four of those are gone and cannot be
recovered without a rewrite.

### Domain packages must not call `Date.now()` or `Math.random()`

Enforced by `no-restricted-globals` and `no-restricted-properties`.

Inject a `Clock` and a seeded `RandomSource` instead. This is what makes an outcome
reproducible — which is what makes a disputed battle explainable and a suspicious drop
investigable.

**Two files are exempt**, and only two: `packages/domain/src/clock.ts` and
`packages/domain/src/random.ts`. They are the sanctioned implementations of the abstractions
everyone else is required to use.

### Leaf packages must not import inner layers

A leaf package importing `@collection-war/domain` creates a cycle: the domain depends on the
leaf, the leaf depends on the domain, and neither can be built or reasoned about
independently.

`shared-types` in particular has **zero runtime dependencies** and must keep it that way. It
is imported by everything; a dependency added there is a dependency added everywhere.

### The database package must not import React, Next, Expo or `api-client`

It implements interfaces the domain declares. It has no presentation concerns and no reason
to call the API it serves.

---

## How this is enforced

### Lint — the primary gate

`eslint.config.mjs` sections 3a–3g define `no-restricted-imports` per layer, each with a
message explaining the rule and linking here.

**Verified.** During the bootstrap, four deliberate violations were introduced and all four
were rejected:

| Probe                                                       | Result                 |
| ----------------------------------------------------------- | ---------------------- |
| `apps/web` importing `@collection-war/database`             | ❌ rejected            |
| `apps/api` importing `@collection-war/api-client`           | ❌ rejected            |
| `packages/validation` importing `@collection-war/domain`    | ❌ rejected            |
| `packages/economy` calling `Math.random()` and `Date.now()` | ❌ rejected (2 errors) |

> **Note on `eslint-plugin-boundaries`:** it was tried first and removed. In a pnpm
> workspace every cross-layer import is a package specifier, and the plugin could not map
> those back to local elements without an import resolver — so it reported nothing while
> appearing to work. A boundary rule that silently passes is worse than no rule, because it
> is trusted. See the comment at the top of `eslint.config.mjs`.

### Install — the structural gate

pnpm's isolated `node_modules` (`node-linker=isolated` in `.npmrc`) means a package can only
import what it declares in its own `package.json`. An undeclared import fails to resolve
rather than accidentally working through hoisting.

**Do not set `node-linker=hoisted` to "fix" a missing import.** Add the dependency to the
package that uses it.

### Review — the judgement gate

Lint catches the layer violations. It does not catch a module reaching into another module's
tables through a shared repository, or a domain concept leaking into the shared kernel.
Those need a reviewer. See [module boundaries](MODULE_BOUNDARIES.md).

---

## Adding a dependency

**Internal** (another workspace package): check the matrix. If it is not allowed, the design
is wrong — do not add an exception.

**External** (from npm): justify it in the pull request. What does it do? Why is the
platform insufficient? Who maintains it, and how actively? What is the install-script and
transitive footprint? See [supply chain security](../security/SUPPLY_CHAIN_SECURITY.md).

Related: [Module boundaries](MODULE_BOUNDARIES.md) ·
[Architecture principles](../constitution/ARCHITECTURE_PRINCIPLES.md)
