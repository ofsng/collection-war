# ADR-0010: Drizzle ORM as the typed database layer

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

The database layer must be type-safe, must support explicit transactions with a chosen
isolation level, and must produce **reviewable migrations**.

That last requirement is not negotiable. The economy depends on `SERIALIZABLE` isolation and
on unique constraints being exactly where they are believed to be. A layer that hides the SQL
or applies schema changes without a reviewable artefact is disqualifying.

## Decision

**Drizzle ORM 0.45.2 with drizzle-kit 0.31.10** and the `pg` driver.

`drizzle-kit generate` produces SQL migrations that are reviewed and committed.
**`drizzle-kit push` is deliberately not wired to any script** — it diffs a live database
against the schema and applies the difference with no migration file, so the change is
neither reviewable nor reproducible on another environment.

## Alternatives considered

**Prisma.** The most popular option, with excellent developer experience. Rejected on three
specific grounds:

1. A separate schema language rather than TypeScript, so the schema cannot use the project's
   own branded types.
2. Transaction isolation control has historically been limited, and `SERIALIZABLE` with
   retry is a hard requirement here.
3. The query engine is a separate binary — extra deployment weight and one more thing to
   version.

**Kysely.** An excellent, very thin, fully type-safe query builder. This was the closest
call. Rejected narrowly because it has no integrated migration generation, so the schema and
the migrations would be maintained separately — and a schema/migration divergence is a class
of bug this project cannot afford in the ledger.

**TypeORM.** Rejected: decorator-heavy, a history of surprising behaviour, and weaker types.

**Raw SQL with a query builder.** Maximum control. Rejected: no compile-time safety on
column names or result shapes, which is precisely where a rename silently breaks the ledger.

## Positive consequences

- The schema **is** TypeScript, so it composes with the rest of the type system.
- The generated SQL is close to what one would write by hand, and is inspectable.
- Explicit transactions with an isolation level — `createUnitOfWork` sets it per transaction.
- Migrations are SQL files: reviewable in a pull request, diffable, reproducible.
- No separate query engine binary.
- Small footprint.

## Negative consequences

- **A younger project** than Prisma or TypeORM, with fewer answers available when something
  goes wrong.
- Fewer conveniences: no built-in seeding framework, no admin studio beyond `drizzle-kit
studio`.
- Relational queries are more verbose than Prisma's `include`.
- Some type errors are hard to read.
- The API is still evolving; upgrades need attention.

## Risks

- Project maturity. Mitigated by the fact that Drizzle is a thin layer over SQL — replacing
  it would mean rewriting query construction, not rewriting the domain, because the domain
  depends only on repository _interfaces_.
- `drizzle-kit push` is one command away from being used carelessly. Mitigated by not
  exposing it as a script, and by documenting why in `drizzle.config.ts` and the migrations
  runbook.

## Review conditions

- The migration generator produces incorrect SQL for a real schema change → re-evaluate, and
  consider Kysely with hand-written migrations.
- Relational query ergonomics become a genuine productivity problem.
- **Before the first production migration:** the full generate → review → apply → roll-forward
  cycle must be exercised against a real database. It has **not** been, because Docker was
  unavailable during the bootstrap.
