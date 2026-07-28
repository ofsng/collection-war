# ADR-0003: pnpm workspaces

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

The monorepo ([ADR-0002](ADR-0002-monorepo.md)) needs a package manager that links workspace
packages, keeps installs fast, and — critically — **does not let a package import something
it never declared**.

That last property is not a nicety. The architecture depends on
[dependency rules](../architecture/DEPENDENCY_RULES.md), and a package manager that hoists
everything into a flat `node_modules` silently defeats them: an undeclared import works
anyway, until the day it does not.

## Decision

**pnpm 10.11.0 with workspaces**, configured with:

- `node-linker=isolated` — a package can only import what it declares.
- `engine-strict=true` — an unsupported Node version fails the install loudly.
- `save-exact=true` — exact versions, no silent drift.
- `onlyBuiltDependencies` — install scripts are blocked by default; allowing one is a
  reviewed supply-chain decision.

## Alternatives considered

**npm workspaces.** Built in, no extra tool. Rejected: it hoists into a flat
`node_modules`, so phantom dependencies work by accident and boundary violations are
invisible. Also slower and far more disk-hungry across a monorepo.

**Yarn Berry (PnP).** Strict resolution and fast. Rejected: PnP still breaks tools that
expect a real `node_modules` — notably parts of the React Native and Metro toolchain, which
this project depends on.

**Bun workspaces.** Very fast. Rejected: less mature for a workspace of this shape, and the
project already accepts enough novelty elsewhere.

## Positive consequences

- **Undeclared imports fail to resolve**, which is the structural half of boundary
  enforcement. The lint rules are the other half.
- Content-addressable store: one copy on disk shared across projects. The full install
  completed in 54 seconds.
- `workspace:*` links resolve to local source, so a change in a package is immediately
  visible to its consumers.
- Blocked install scripts reduce the supply-chain surface by default.

## Negative consequences

- **Isolated `node_modules` occasionally breaks tools that assume hoisting** — Metro is the
  usual suspect. Mitigated by `metro.config.js` declaring `watchFolders` and
  `nodeModulesPaths` explicitly.
- Every package must declare everything it uses, including type packages. More `package.json`
  churn.
- `engine-strict` makes an unsupported Node version a hard failure. **This is intended** —
  the bootstrap machine's default Node is v18 (EOL), and a silent partial install would be
  far worse than a clear error.
- One more tool to install before `git clone` works.

## Risks

- A future tool that cannot cope with symlinked, isolated modules. The escape hatch is
  `node-linker=hoisted`, which would forfeit the structural guarantee — so it is documented
  in `.npmrc` as something not to reach for casually.
- `onlyBuiltDependencies` will occasionally block a package that genuinely needs a build
  step. That is a prompt for review, not an obstacle.

## Review conditions

- A required tool proves incompatible with isolated modules and cannot be configured →
  reconsider, and record what was given up.
- Install time or store size becomes a real problem.
