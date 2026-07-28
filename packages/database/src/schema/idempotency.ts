import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Idempotency keys.
 *
 * A mobile client on a poor connection retries. Without this table, the retry of "buy this
 * listing" charges the player twice. With it, the retry returns the original result.
 *
 * The mechanism is the UNIQUE INDEX below, not application logic. A check-then-insert in
 * application code is a race, and under concurrency the race resolves as a double spend.
 * Two concurrent inserts of the same key must have one of them rejected by the database.
 */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey(),

    /** Client-supplied. Validated for length and charset before it reaches here. */
    key: text('key').notNull(),
    /**
     * Namespaces the key by operation, e.g. `marketplace.purchase`. Without a scope, a
     * client reusing one key across two different operations would get the wrong cached
     * result back from the second one.
     */
    scope: text('scope').notNull(),

    /** Whose request this was. Keys are per-player; one player cannot replay another's. */
    playerId: uuid('player_id'),

    /** IN_PROGRESS | COMPLETED */
    status: text('status').notNull().default('IN_PROGRESS'),

    /** The response to replay. Null while in progress. */
    result: jsonb('result'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    /**
     * Keys are retained for a bounded window and then swept. Keeping them forever grows
     * without limit; expiring them too soon reopens the double-spend window for a client
     * that retries late. The window is a documented decision, not an accident —
     * see docs/architecture/API_ARCHITECTURE.md#idempotency.
     */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    /** The safety property itself. Everything else here is bookkeeping. */
    uniqueIndex('idempotency_key_scope_unique').on(table.key, table.scope),
    index('idempotency_expiry_idx').on(table.expiresAt),
    index('idempotency_player_idx').on(table.playerId),
  ],
);

export type IdempotencyRow = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyRow = typeof idempotencyKeys.$inferInsert;
