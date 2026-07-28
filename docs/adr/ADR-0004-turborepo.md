# ADR-0004: Turborepo as the task runner

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Eighteen workspace projects each have `build`, `typecheck`, `test` and `lint`. They form a
dependency graph: `apps/api` cannot typecheck until `packages/domain` has built.

Running everything on every change wastes minutes per iteration. Running things in the wrong
order produces confusing failures that look like code problems.

## Decision

**Turborepo 2.10.7**, configured in `turbo.json`.

- `build` depends on `^build` (upstream packages first).
- `typecheck` and `test` depend on `^build`, because compiled `.d.ts` files must exist.
- Outputs are declared per task so they can be cached.
- `test:integration` and `test:e2e` are `cache: false` — they depend on external services
  whose state Turborepo cannot hash.
- `dev` is `persistent: true`.

## Alternatives considered

**pnpm's built-in `--recursive` with topological ordering.** Free, already installed.
Rejected: no caching. Every run redoes work that has not changed, which on a repository this
size is most of the run.

**Nx.** More powerful: better graph analysis, generators, distributed execution. Rejected as
over-scoped — it brings a plugin ecosystem and configuration surface that would need
maintaining, for capability this project does not yet need.

**Make or shell scripts.** Rejected: no dependency graph, no caching, and cross-platform
problems on day one.

**Bazel.** Rejected. Correct at Google's scale; enormously disproportionate here.

## Positive consequences

- Only what changed is rebuilt. A no-op `verify` completes in seconds.
- Correct ordering is declarative, not encoded in a script somebody has to maintain.
- Filtering (`--filter=./packages/*`) makes it easy to work on one area.
- The same configuration works locally and in CI.
- CI can cancel superseded runs and use the same cache semantics.

## Negative consequences

- Another dependency and another configuration file.
- **Cache correctness depends on correctly declared `inputs` and `outputs`.** A missing
  output means a cache hit returns an incomplete build — the worst kind of failure, because
  it looks like success. Mitigated by declaring outputs explicitly per task.
- Cached failures can confuse: a fixed problem still fails until the input hash changes.
- The mobile app produces no build output, which required an explicit `outputs: []` in
  `apps/mobile/turbo.json` to silence a warning.

## Risks

- **The main risk is a stale or wrong cache.** `turbo run <task> --force` is the escape hatch,
  and it is documented in the testing runbook.
- Remote caching is a paid Vercel service. Not enabled, and not needed — local caching is
  sufficient for one machine. If it is ever wanted, a self-hosted cache server is an option
  that avoids the cost.

## Review conditions

- A cache-correctness bug reaches CI → audit every task's declared inputs and outputs.
- Clean CI exceeds 10 minutes → evaluate self-hosted remote caching before anything more
  drastic.
