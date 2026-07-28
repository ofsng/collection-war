import { boolean, index, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Identity — accounts and sessions.
 *
 * Owned by the `identity` module. Nothing else writes these tables.
 */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),

    /**
     * Stored lowercased and trimmed by the application before it reaches here.
     *
     * The unique index is what makes registration safe under concurrency: two simultaneous
     * registrations for the same address cannot both succeed, and the loser gets a
     * constraint violation rather than a second account.
     */
    email: text('email').notNull(),

    /**
     * `scrypt$N$r$p$salt$hash` — self-describing, so the parameters travel with the hash and
     * can be raised over time without a flag day. The prefix is also the migration
     * mechanism: an Argon2id hash would be distinguishable, allowing rehash-on-login rather
     * than a forced password reset. See ADR-0026.
     */
    passwordHash: text('password_hash').notNull(),

    emailVerified: boolean('email_verified').notNull().default(false),

    /** ACTIVE | SUSPENDED | CLOSED */
    status: text('status').notNull().default('ACTIVE'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),

    /**
     * The refresh token is stored HASHED, never in plain text. A database leak must not hand
     * the attacker a set of working sessions.
     */
    refreshTokenHash: text('refresh_token_hash').notNull(),

    /**
     * Rotation family.
     *
     * Every refresh issues a new token in the same family and marks the old one used. If an
     * already-used token is presented, one copy was stolen — the legitimate client and the
     * attacker cannot both hold a valid one — so the **entire family is revoked**. That is
     * what turns token theft from silent persistent access into a detectable event.
     */
    familyId: uuid('family_id').notNull(),
    used: boolean('used').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),

    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_sessions_token_unique').on(table.refreshTokenHash),
    index('user_sessions_family_idx').on(table.familyId),
    index('user_sessions_user_idx').on(table.userId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type UserSessionRow = typeof userSessions.$inferSelect;
