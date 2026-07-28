# ADR-0025: PGlite for integration tests

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** CW-0100 Phase 0

## Context

Integration tests are how the project proves the claims its economy design rests on: that a
unique index actually rejects a duplicate idempotency key, that a transaction actually rolls
back, that a constraint actually holds.

Six such tests exist and **had never been executed**, because they need PostgreSQL and Docker
is not installed on the development machine
([R1](../status/RISKS.md#r1--local-infrastructure-has-never-been-started--high)). That made
the single largest risk in the project unverifiable rather than merely unverified.

## Decision

**Integration tests run against [PGlite](https://pglite.dev) — PostgreSQL compiled to WASM,
in-process — by default, with real PostgreSQL used when `DATABASE_URL` is set.**

Drizzle ships a first-class `drizzle-orm/pglite` driver, so the same schema, the same
migrations and the same repository code run against both.

Verified by spike before adopting:

```text
PostgreSQL 18.3 (PGlite 0.5.4) on wasm32-unknown-linux-gnu
CHECK constraint enforced          ✓
UNIQUE constraint enforced         ✓
transaction rollback works         ✓
SERIALIZABLE accepted              ✓
```

### What this explicitly does NOT replace

PGlite is **single-connection**. It cannot run two transactions at once, so it cannot test:

- concurrent double-spend against the same balance;
- a genuine `40001` serialization failure and the retry path in `createUnitOfWork`;
- connection-pool behaviour under load.

**Those tests stay written and stay gated on real PostgreSQL.** `docker-compose.yml` remains
the reference environment, and the marketplace and economy phases must not be signed off on
PGlite alone.

## Alternatives considered

**Keep waiting for Docker.** Zero effort. Rejected: it leaves the highest-value tests
unexecuted indefinitely, and "we will verify it later" is how a system reaches production
having never tested its own integrity guarantees.

**Testcontainers.** The usual answer, and still correct for CI. Rejected as the default here
for the same reason as Docker itself — it requires a container runtime that does not exist on
this machine.

**Mock the database.** Rejected outright. A mocked unique index proves nothing about the
real one, and the real one is the entire mechanism preventing double spending.

**SQLite for tests.** Rejected: different SQL dialect, no `jsonb`, no partial indexes, weaker
isolation. Testing against a different engine than production is how "works locally" happens.

## Positive consequences

- **The integrity tests actually run** — on any machine, and in CI, with no runtime to install.
- Very fast: no container start-up, so integration tests are usable in a watch loop.
- The same schema and migrations execute, so a migration error surfaces in tests.
- CI needs no service containers for the default path.
- One risk moves from "cannot verify" to "verified, with stated limits".

## Negative consequences

- **A second database target to keep working.** A PGlite-specific quirk could mask a real
  Postgres problem.
- **Concurrency remains untested** — the most valuable property of all, and the one most
  likely to hide a bug.
- WASM start-up is not free (~100ms per instance), so tests share an instance per file.
- PGlite tracks PostgreSQL closely but is not identical; an exotic feature may differ.

## Risks

- **The main risk is false confidence**: reading "integration tests pass" as "concurrency is
  safe". Mitigated by stating the limit in this ADR, in the readiness report, in
  `TESTING.md`, and in the test files themselves.
- Divergence between PGlite and PostgreSQL. Mitigated by the same tests running against real
  Postgres whenever `DATABASE_URL` is present.

## Review conditions

- **Before the marketplace or economy phase ships**, the concurrency tests must run against
  real PostgreSQL. PGlite is not sufficient for those.
- If PGlite diverges from PostgreSQL in a way that hides a defect, drop it for that test and
  record why.
- If Docker becomes available, real PostgreSQL becomes the default and PGlite stays as the
  fast path.
