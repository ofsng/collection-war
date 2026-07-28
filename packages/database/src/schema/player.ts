import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './identity';

/**
 * Player profile — the in-game persona, distinct from the account that authenticates it.
 *
 * Owned by the `player-profile` module.
 */
export const playerProfiles = pgTable(
  'player_profiles',
  {
    id: uuid('id').primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),

    displayName: text('display_name').notNull(),

    /**
     * The player's locale, stored SERVER-SIDE.
     *
     * This is why switching to English on the web shows English on the phone. A device-only
     * preference would diverge per client, and an explicit choice must beat anything
     * inferred on every device. See docs/architecture/GAME_CLIENT_SYNC.md.
     */
    locale: text('locale').notNull().default('tr-TR'),

    accountLevel: integer('account_level').notNull().default(1),
    experience: integer('experience').notNull().default(0),

    /**
     * Set when the starter is granted.
     *
     * The second half of the once-ever guarantee: the idempotency key protects against a
     * retried request, and this column protects against two *different* requests. Checked
     * inside the granting transaction, so concurrent calls cannot both pass.
     */
    starterGrantedAt: timestamp('starter_granted_at', { withTimezone: true }),

    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('player_profiles_user_unique').on(table.userId)],
);

export type PlayerProfileRow = typeof playerProfiles.$inferSelect;
