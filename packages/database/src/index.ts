/**
 * Collection War — database access.
 *
 * The ONLY package permitted to know that PostgreSQL exists. Everything above it works
 * against the repository interfaces declared in `@collection-war/domain`; this package
 * implements them.
 *
 * WHAT IS HERE: the connection pool, the transaction helper, the migration runner, the
 * PLATFORM tables (`outbox`, `idempotency_keys`), and the GAME tables for the first playable
 * slice — identity, player profiles, the creature catalog, owned creatures, teams, inventory,
 * PvE content and battle records.
 *
 * Each game table is owned by exactly one module (docs/architecture/GAME_STATE_OWNERSHIP.md);
 * nothing reads another module's tables directly.
 *
 * WHAT IS NOT HERE: marketplace and ledger tables. They belong to phases that have not been
 * specified, and designing them now would lock in decisions that are expensive to reverse
 * once real player data exists.
 */

export * from './client';
export * from './transaction';
export * from './health';
export * as schema from './schema';
export * from './content/seed-content';
export * from './content/load';
