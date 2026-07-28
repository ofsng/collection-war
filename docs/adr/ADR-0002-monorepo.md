# ADR-0002: Monorepo

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Five applications and thirteen shared packages must stay consistent. Contract changes — an
API response shape, a shared type, a translation key — affect the server and up to three
clients simultaneously.

A released mobile build cannot be updated in lockstep with the server, so _contract drift is
already a hard problem_. Anything that makes it harder is a serious cost.

## Decision

**One repository containing every application and package.**

```text
apps/       web · admin · mobile · api · workers
packages/   13 shared packages
docs/       canonical documentation
```

## Alternatives considered

**A repository per application, with packages published to a registry.** Independent
versioning and smaller checkouts. Rejected: a shared-type change becomes publish → wait →
bump → test, repeated per consumer. For a small team that is hours of overhead on a change
that should take minutes, and the delay makes drift _more_ likely, not less.

**Polyrepo with Git submodules.** Rejected: submodules are a well-known source of
"it works on my machine", and they solve none of the versioning problem.

**A monorepo containing only the backend, with separate client repositories.** Tempting,
since clients deploy differently. Rejected: the client/server contract is exactly the
boundary that benefits most from atomic changes.

## Positive consequences

- A contract change lands as **one atomic commit** across the server and every client.
- One dependency graph, one lockfile, one set of versions.
- Refactors cross package boundaries safely — the type checker sees every caller.
- One CI configuration, one lint config, one formatting config.
- Onboarding is one clone.

## Negative consequences

- A larger checkout and a heavier initial install (~1.3 GB of `node_modules`).
- CI must be selective, or every change rebuilds everything. Mitigated by Turborepo filtering
  and caching ([ADR-0004](ADR-0004-turborepo.md)).
- Boundaries must be enforced deliberately — a monorepo makes it trivially easy to import
  anything from anywhere. Mitigated by
  [dependency rules](../architecture/DEPENDENCY_RULES.md), which are lint-enforced and
  verified.
- Access control is all-or-nothing at the repository level.

## Risks

- **The main risk is boundary erosion.** Nothing physically stops a client importing the
  database package. The mitigation is lint rules that were tested against deliberate
  violations rather than assumed to work.
- Build times grow with the repository. Mitigated by caching and filtering; revisit if a
  clean CI run exceeds ~10 minutes.

## Review conditions

- Clean CI exceeds 10 minutes → invest in remote caching before considering a split.
- A component genuinely needs independent release cadence and a separate audience → consider
  extracting just that component.
- The team grows past the point where one repository's access model is workable.
