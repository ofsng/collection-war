import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Transactional outbox.
 *
 * Rows are written inside the same transaction as the business change they describe, then
 * delivered by a relay worker. See `@collection-war/domain/outbox` for why, and
 * docs/architecture/EVENT_ARCHITECTURE.md for the full design.
 *
 * This table is deliberately created before any domain table: the outbox must exist from
 * the very first feature, because retrofitting reliable event delivery onto a system that
 * already fires side effects inline is a rewrite, not a refactor.
 */
export const outbox = pgTable(
  'outbox',
  {
    id: uuid('id').primaryKey(),

    /** `Marketplace.ListingSold`. Consumers subscribe by name. */
    eventName: text('event_name').notNull(),
    /** Bumped when the payload shape changes incompatibly. */
    eventVersion: integer('event_version').notNull().default(1),

    aggregateType: text('aggregate_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),

    /** The full DomainEvent. jsonb rather than text so it can be queried during incidents. */
    payload: jsonb('payload').notNull(),

    correlationId: text('correlation_id').notNull(),

    /** PENDING | PUBLISHED | FAILED | DEAD_LETTER */
    status: text('status').notNull().default('PENDING'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),

    /** All timestamps are server-generated UTC. A client never supplies one. */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    /**
     * The relay's hot path: "give me the next batch that is due". Composite over
     * (status, next_attempt_at) so the scan touches only pending rows — without it,
     * polling degrades linearly as published rows accumulate.
     */
    index('outbox_pending_idx').on(table.status, table.nextAttemptAt),
    /** Lets an incident responder pull the full event history for one entity. */
    index('outbox_aggregate_idx').on(table.aggregateType, table.aggregateId),
    index('outbox_correlation_idx').on(table.correlationId),
  ],
);

export type OutboxRow = typeof outbox.$inferSelect;
export type NewOutboxRow = typeof outbox.$inferInsert;
