/**
 * Collection War — database access.
 *
 * The ONLY package permitted to know that PostgreSQL exists. Everything above it works
 * against the repository interfaces declared in `@collection-war/domain`; this package
 * implements them.
 *
 * WHAT IS HERE AT BOOTSTRAP: the connection pool, the transaction helper, the migration
 * runner, and two PLATFORM tables (`outbox`, `idempotency_keys`).
 *
 * WHAT IS NOT HERE: any game schema. There are no creature, inventory, marketplace or
 * ledger tables, because designing them before the domain specifications are approved
 * would lock in decisions that are expensive to reverse once real player data exists.
 * The planned entity map is in docs/architecture/DATA_ARCHITECTURE.md.
 */

export * from './client';
export * from './transaction';
export * from './health';
export * as schema from './schema';
