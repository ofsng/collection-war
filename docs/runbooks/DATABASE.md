# Runbook: Database

> Audience: anyone working with PostgreSQL locally, or debugging a query. Date: 2026-07-28.

---

## Connecting

```bash
psql postgresql://collection_war:collection_war_local_dev@localhost:5432/collection_war

# or through the container, if psql is not installed locally
docker compose -p collection-war exec postgres \
  psql -U collection_war -d collection_war
```

```bash
pnpm --filter @collection-war/database run db:studio   # drizzle-kit studio, browser UI
```

---

## Schema

```bash
pnpm db:generate    # TypeScript schema → reviewable SQL migration
pnpm db:migrate     # apply pending migrations
pnpm db:seed        # nothing to seed yet, and it says so
```

The schema is TypeScript, in `packages/database/src/schema/`. It is the source; the SQL is
generated from it.

**Never edit a generated migration to change what it does.** Change the schema and regenerate.
See [migrations](MIGRATIONS.md).

### What exists today

Two platform tables. **No game schema** — designing tables before the domain specifications
are approved would lock in decisions that become expensive once real player data exists.

| Table              | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `outbox`           | Transactional event delivery                                 |
| `idempotency_keys` | Double-spend protection via a unique index on `(key, scope)` |

---

## Useful queries

### What is slow

```sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

Needs `pg_stat_statements`. Worth enabling before you need it, not after.

### Explain a query properly

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

`ANALYZE` runs it; `BUFFERS` shows whether it hit cache or disk. Without `BUFFERS` you are
guessing about the part that usually matters.

### Table and index sizes

```sql
SELECT relname,
       pg_size_pretty(pg_total_relation_size(relid)) AS total,
       pg_size_pretty(pg_relation_size(relid))       AS table_only
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### Unused indexes

```sql
SELECT relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY relname;
```

An index with zero scans costs write throughput and disk for nothing. **Check that it is not
a uniqueness constraint before dropping it** — those exist for correctness, not speed, and
dropping the idempotency index would reintroduce double spending.

### Blocked queries

```sql
SELECT pid, state, wait_event_type, wait_event, left(query, 80), now() - query_start AS age
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY age DESC;
```

### Long transactions

```sql
SELECT pid, now() - xact_start AS duration, left(query, 80)
FROM pg_stat_activity
WHERE xact_start IS NOT NULL AND now() - xact_start > interval '1 minute'
ORDER BY duration DESC;
```

A long-running transaction holds locks and blocks vacuum. It is usually a bug, not load.

---

## Serialization failures are normal

Operations in `SERIALIZABLE_OPERATIONS` run at `SERIALIZABLE` isolation, and PostgreSQL will
sometimes abort one with SQLSTATE `40001`.

**This is expected behaviour, not an error.** It means PostgreSQL prevented a
non-serializable interleaving — exactly what it was asked to do. `createUnitOfWork` retries
with jittered backoff.

If retries are frequent enough to matter, the fix is usually to shorten the transaction, not
to weaken the isolation level.

---

## Local data

```bash
# dump
docker compose -p collection-war exec -T postgres \
  pg_dump -U collection_war -d collection_war --format=custom > local-backup.dump

# restore
docker compose -p collection-war exec -T postgres \
  pg_restore -U collection_war -d collection_war --clean --if-exists < local-backup.dump

# start over
pnpm infra:reset -- --yes && pnpm infra:up && pnpm db:migrate
```

For anything other than local data, see [backups](BACKUPS.md).

---

## Conventions

Full reasoning in [data architecture](../architecture/DATA_ARCHITECTURE.md).

- **UUIDv7 primary keys** — time-ordered, no business-volume leakage.
- **`timestamptz`, UTC, server-generated.** A client never supplies a timestamp that matters.
- **Soft deletion** for player-owned records, with a partial index on `deleted_at IS NULL`.
- **`version` column** for optimistic concurrency on mutable rows.
- **`snake_case`** for tables and columns.
- **Foreign keys are indexed** — PostgreSQL does not do it automatically.
- **Unique constraints are correctness, not performance.**

The local container is initialised with `--locale=C` so ordering is deterministic and does
not depend on the host locale — which matters here, since Turkish casing rules differ from C.

---

## Things not to do

- **`drizzle-kit push`.** It applies a schema diff with no migration file, so the change is
  neither reviewable nor reproducible. Not wired to any script, deliberately.
- **Editing an applied migration.** Write a new one.
- **`DELETE` on `ledger_entries` or `audit_records`.** They are append-only. Correct with a
  compensating entry.
- **Manual `UPDATE` in production** to "fix" data. Every write goes through the application,
  so it is audited and idempotent.
- **Adding an index without measuring.** Every index costs write throughput.

Related: [Migrations](MIGRATIONS.md) · [Backups](BACKUPS.md) ·
[Data architecture](../architecture/DATA_ARCHITECTURE.md)
