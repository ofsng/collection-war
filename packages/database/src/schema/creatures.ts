import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { creatureSpecies } from './catalog';
import { playerProfiles } from './player';

/**
 * Owned creatures — the instances players own, and the most valuable player state in the game.
 *
 * Owned by the `owned-creatures` module. `player_id` is the single field that decides who
 * owns what; every write to it goes through that module, inside a transaction, with a
 * history row.
 */
export const ownedCreatures = pgTable(
  'owned_creatures',
  {
    id: uuid('id').primaryKey(),

    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.id),

    speciesId: uuid('species_id')
      .notNull()
      .references(() => creatureSpecies.id),

    nickname: text('nickname'),

    level: integer('level').notNull().default(1),
    experience: integer('experience').notNull().default(0),

    /**
     * A locked creature cannot be used, consumed, levelled, put in a team or re-listed.
     *
     * Enforced in the domain, not by hiding a button — otherwise a player could list a
     * creature for sale and keep fighting with it.
     */
    locked: boolean('locked').notNull().default(false),
    favorite: boolean('favorite').notNull().default(false),

    /** starter | battle_reward | summon | purchase | admin_grant */
    acquiredVia: text('acquired_via').notNull(),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),

    /** The content version this creature's stats are computed against. */
    contentVersion: text('content_version').notNull(),

    /** Optimistic concurrency. Every update carries the version it read. */
    version: integer('version').notNull().default(1),

    /** Soft delete. A player-owned creature is never hard-deleted by an ordinary path. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The hot path: "list my creatures". Partial, so the index carries only live rows —
    // every query against this table filters `deleted_at IS NULL`.
    index('owned_creatures_player_idx')
      .on(table.playerId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('owned_creatures_species_idx').on(table.speciesId),
  ],
);

/**
 * Append-only creature history.
 *
 * Survives ownership change: the lifetime record persists while the new owner's bond starts
 * fresh, and the previous owner's private information is never exposed.
 */
export const creatureHistory = pgTable(
  'creature_history',
  {
    id: uuid('id').primaryKey(),
    creatureId: uuid('creature_id')
      .notNull()
      .references(() => ownedCreatures.id),

    /** acquired | levelled_up | nickname_changed | ownership_transferred | locked | unlocked */
    eventType: text('event_type').notNull(),
    data: jsonb('data').notNull(),

    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('creature_history_creature_idx').on(table.creatureId, table.occurredAt)],
);

/** Teams. A team exists only to enter a battle, which is why it lives with battle concerns. */
export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.id),
    name: text('name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('teams_player_idx').on(table.playerId)],
);

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id),
    creatureId: uuid('creature_id')
      .notNull()
      .references(() => ownedCreatures.id),
    /** 0-2 are active, 3 is the reserve. */
    slot: integer('slot').notNull(),
  },
  (table) => [
    // Two constraints, both correctness rather than performance:
    //   one creature per slot, and one slot per creature.
    // The second is what stops the same creature occupying three slots at once.
    uniqueIndex('team_members_team_slot_unique').on(table.teamId, table.slot),
    uniqueIndex('team_members_team_creature_unique').on(table.teamId, table.creatureId),
  ],
);

export type OwnedCreatureRow = typeof ownedCreatures.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;
export type TeamMemberRow = typeof teamMembers.$inferSelect;
