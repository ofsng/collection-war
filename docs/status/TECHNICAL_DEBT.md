# Technical Debt

> **Date: 2026-07-28.** Perishable.
> Audience: anyone who notices something odd and wonders whether it was deliberate.

Debt is work **done in a way that will need redoing**. Distinct from
[deferred work](DEFERRED_WORK.md), which is work not started.

The bootstrap accumulated very little, because there is very little code. What exists is
listed honestly — including the items that are arguably fine.

---

## TD1 — Mobile duplicates the design-system palette · **Medium**

`apps/mobile/src/lib/config.ts` re-declares nine colour values that also exist in
`packages/design-system/src/tokens.ts`.

**Why it happened:** React Native cannot use the design system's DOM components, and its
token module is not separately exportable without a subpath export or a new package.

**Cost:** a colour change must be made in both places, or they diverge silently.

**Mitigation:** a test asserts the values match — so divergence fails the build rather than
shipping.

**Fix:** a separate tokens package, or a subpath export. Blocked on
[D8](OPEN_DECISIONS.md#d8--unifying-design-tokens-across-dom-and-native).

---

## TD2 — Type-aware linting is not enabled · **Medium**

`typescript-eslint` runs `recommended`, not `recommendedTypeChecked`.

**Cost:** a genuinely valuable class of bug goes uncaught — floating promises, unsafe `any`
propagation, misused `await`. In a codebase whose economy correctness depends on transactions
completing, a floating promise is exactly the kind of bug that matters.

**Why it happened:** type-checked rules need a project-service configuration across 19
projects, and are meaningfully slower. Enabling it during a bootstrap risked a long
configuration detour.

**Fix:** enable `projectService: true` and evaluate the added lint time. See
[D7](OPEN_DECISIONS.md#d7--type-aware-linting).

---

## TD3 — A 404 for an unmatched route carries no correlation id · **Low**

The correlation interceptor is an `APP_INTERCEPTOR`, which runs only for **matched** routes.
A 404 from an unrouted path therefore returns the standard error shape without a
`correlationId`.

**Cost:** minor inconsistency. A 404 on a path that does not exist is rarely the error anyone
needs to trace.

**Fix:** move correlation assignment to a Fastify `onRequest` hook, which runs before routing.

---

## TD4 — The database health check leaks its own query text · **Low**

A failed `SELECT 1` returns Drizzle's message, which includes the query:
`"Failed query: SELECT 1\nparams: "`.

**Cost:** essentially none — it is our own query, with no parameters, on an endpoint that
already reports dependency status. But it is a pattern that would matter on a query carrying
parameters.

**Fix:** map database errors to a fixed set of messages in the health probe.

---

## TD5 — Package tests depend on built output from sibling packages · **Low**

`turbo run test` depends on `^build`, so a package's tests run against its dependencies'
compiled `dist/`.

**Cost:** a stale `dist/` produces confusing failures, and the first run after a clean
checkout is slower.

**Why:** the alternative — source-condition exports — has its own problems with NestJS and
Metro. The current approach is the compatible one.

**Fix:** none proposed. `pnpm clean && pnpm install && pnpm build` resolves confusion, and it
is in the runbook.

---

## TD6 — `.claude/rules/` and `.agents/rules/` are structured differently · **Low**

`.claude/rules/` has twelve files; `.agents/rules/` is a single index.

**Why:** Claude Code's rules are loaded per area, so per-area files fit. Antigravity's rules
are read as a set, so an index fits.

**Cost:** an inconsistency a reader will notice.

**Assessment:** arguably correct rather than debt. Both are thin pointers, and neither
duplicates canonical content — which is the property that actually matters
([ADR-0018](../adr/ADR-0018-ai-tool-adapter-strategy.md)). Listed for transparency.

---

## TD7 — `@fastify/static` is pinned to 8.3.0 while 10.x exists · **Low**

Added at runtime during the bootstrap, when Swagger UI failed without it. Version 8 was pinned
without evaluating 10.

**Cost:** possibly a version behind for no reason.

**Fix:** check compatibility with Fastify 5 and upgrade if appropriate.

---

## What this list does not contain, and why that matters

No commented-out code · no `any` escapes · no skipped tests · no `eslint-disable` · no TODO
comments standing in for missing work · no placeholder implementations pretending to be real.

Those absences are deliberate. **A placeholder that works is the most dangerous kind of debt**,
because it gets forgotten and ships — which is exactly why the admin guard denies everything
and has a test asserting it, rather than returning a convenient fake session.

---

## Recording debt

When you knowingly take a shortcut, add an entry: **what · why · what it costs · how to fix
it**.

Undocumented debt is indistinguishable from a bug, and the next person spends an hour
deciding which it is.

---

Related: [Deferred work](DEFERRED_WORK.md) · [Open decisions](OPEN_DECISIONS.md) ·
[Risks](RISKS.md)
