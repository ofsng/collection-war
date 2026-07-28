# Rule: Database

**Canonical:** [DATA_ARCHITECTURE.md](../../docs/architecture/DATA_ARCHITECTURE.md) ·
[MIGRATIONS.md](../../docs/runbooks/MIGRATIONS.md) ·
[DATABASE.md](../../docs/runbooks/DATABASE.md) ·
[ADR-0010](../../docs/adr/ADR-0010-drizzle-orm.md)

---

## Conventions

- **UUIDv7** primary keys
- **`timestamptz`, UTC, server-generated.** A client never supplies a timestamp that matters
- **Soft deletion** for player-owned records, with a partial index on `deleted_at IS NULL`
- **`version`** column for optimistic concurrency on mutable rows
- **`snake_case`** tables and columns
- **Foreign keys get indexes** — PostgreSQL does not create them
- **Immutable** for ledger entries, audit records and battle results

## Migrations

```bash
pnpm db:generate    # schema → SQL
# READ THE GENERATED SQL, every line
pnpm db:migrate
pnpm test:integration
```

**Step two is not optional.** The generator cannot know whether a rename is a rename or a
drop-and-add, and getting that wrong silently deletes a column of production data.

**Never edit an applied migration.** Write a new one.

**`drizzle-kit push` is not used** — it applies a diff with no reviewable artefact. It is
deliberately not wired to any script.

Breaking changes use [expand/contract](../../docs/runbooks/MIGRATIONS.md#expand--contract),
across **separate releases**.

## Isolation

`READ COMMITTED` by default. **`SERIALIZABLE`** for the operations in
`SERIALIZABLE_OPERATIONS` — where an invariant spans rows the statements do not lock.

Serialization failures (`40001`) are **expected and normal**, not errors. The unit of work
retries with jittered backoff.

## Indexes

Index for the queries you actually run. Equality columns first, then range, then sort.
Measure with `EXPLAIN (ANALYZE, BUFFERS)`.

**A unique constraint is correctness, not performance.** The idempotency index is what
prevents double spending — never drop it to speed up writes.

## Never

- `DELETE` from `ledger_entries` or `audit_records`
- Hard-delete a player-owned record
- Manual `UPDATE` in production to "fix" data
- Add an index without measuring
- Let a module read another module's tables

## Current state

Two platform tables (`outbox`, `idempotency_keys`). **No game schema** — that is
[CW-0002](../../docs/tasks/BACKLOG.md). No migration has ever been run, because Docker was
unavailable during the bootstrap.
