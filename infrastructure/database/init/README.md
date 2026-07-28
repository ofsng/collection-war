# PostgreSQL initialisation

Scripts here run **once**, when the PostgreSQL container initialises an empty data directory.
The directory is mounted read-only into the container.

## Currently empty, and that is correct

Schema is managed by **migrations**, not by initialisation scripts. A table created here would
exist locally and nowhere else, and no migration would account for it — which is exactly the
divergence between environments that migrations exist to prevent.

## What legitimately belongs here

- `CREATE EXTENSION` statements (`pg_stat_statements`, `pgcrypto`)
- Role creation for a hosted-environment rehearsal
- Database-level settings that must precede any migration

**Nothing that creates or alters a table.**

## Warning

These scripts run only on a **fresh** volume. Adding one and restarting an existing container
does nothing, which is a confusing hour to spend. To re-run them:

```bash
pnpm infra:reset -- --yes && pnpm infra:up
```

See [MIGRATIONS.md](../../../docs/runbooks/MIGRATIONS.md).
