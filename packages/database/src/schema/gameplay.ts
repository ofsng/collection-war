import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { creatureSpecies, materialDefinitions } from './catalog';
import { playerProfiles } from './player';

/**
 * Inventory, PvE content and battle records.
 */

// ────────────────────────────────────────────────────────────────── inventory

export const materialInventory = pgTable(
  'material_inventory',
  {
    id: uuid('id').primaryKey(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.id),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materialDefinitions.id),

    quantity: integer('quantity').notNull().default(0),
    version: integer('version').notNull().default(1),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('material_inventory_player_material_unique').on(table.playerId, table.materialId),
    /**
     * The database refuses a negative quantity.
     *
     * Application code also checks, but a CHECK constraint cannot be forgotten, bypassed by
     * a new code path, or lost in a refactor. Correctness belongs as close to the data as it
     * can get.
     */
    check('material_inventory_quantity_non_negative', sql`${table.quantity} >= 0`),
  ],
);

/**
 * Append-only inventory movements.
 *
 * Mirrors the ledger pattern: a quantity that can be assigned rather than derived has no
 * history, and "where did my materials go?" becomes a guess. Every row records what caused
 * it, so every material a player holds is traceable to the thing that produced it.
 */
export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: uuid('id').primaryKey(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.id),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materialDefinitions.id),

    /** Signed: positive is a grant, negative is a consumption. */
    delta: integer('delta').notNull(),

    /** battle_reward | level_up_cost | craft_input | craft_output | admin_grant */
    reason: text('reason').notNull(),

    /** What caused it — `battle` + the battle id. */
    sourceType: text('source_type').notNull(),
    sourceId: uuid('source_id'),

    idempotencyKey: text('idempotency_key'),

    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('inventory_transactions_player_idx').on(table.playerId, table.occurredAt),
    index('inventory_transactions_source_idx').on(table.sourceType, table.sourceId),
  ],
);

// ──────────────────────────────────────────────────────────────── PvE content

export const pveNodes = pgTable(
  'pve_nodes',
  {
    id: uuid('id').primaryKey(),
    slug: text('slug').notNull(),
    contentVersion: text('content_version').notNull(),

    chapterSlug: text('chapter_slug').notNull(),
    biomeSlug: text('biome_slug').notNull(),

    nameKey: text('name_key').notNull(),
    descriptionKey: text('description_key').notNull(),

    orderIndex: integer('order_index').notNull(),

    /** The node that must be cleared first. Null for the first node of a chapter. */
    requiresNodeSlug: text('requires_node_slug'),

    opponentSpeciesId: uuid('opponent_species_id')
      .notNull()
      .references(() => creatureSpecies.id),
    opponentLevel: integer('opponent_level').notNull(),

    /** `{ experience, drops[] }` — validated by `validateRewardTable` on load. */
    rewards: jsonb('rewards').notNull(),
  },
  (table) => [
    uniqueIndex('pve_nodes_slug_version_unique').on(table.slug, table.contentVersion),
    index('pve_nodes_chapter_idx').on(table.chapterSlug, table.orderIndex),
  ],
);

export const playerPveProgress = pgTable(
  'player_pve_progress',
  {
    id: uuid('id').primaryKey(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.id),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => pveNodes.id),

    clearedAt: timestamp('cleared_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('player_pve_progress_player_node_unique').on(table.playerId, table.nodeId)],
);

// ────────────────────────────────────────────────────────────── battle records

/**
 * Battle records. **Immutable once written.**
 *
 * The seed and both versions are what make a result replayable — without them a battle is an
 * unexplainable number, and "why did I lose?" has no answer.
 */
export const battleSessions = pgTable(
  'battle_sessions',
  {
    id: uuid('id').primaryKey(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playerProfiles.id),
    nodeId: uuid('node_id').references(() => pveNodes.id),

    /** Server-generated. Never supplied or influenced by a client. */
    seed: text('seed').notNull(),
    engineVersion: text('engine_version').notNull(),
    contentVersion: text('content_version').notNull(),

    outcome: text('outcome').notNull(),
    turnCount: integer('turn_count').notNull(),

    /** The ordered replay log. The client animates this; it never produces one. */
    events: jsonb('events').notNull(),
    finalState: jsonb('final_state').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('battle_sessions_player_idx').on(table.playerId, table.createdAt)],
);

export type MaterialInventoryRow = typeof materialInventory.$inferSelect;
export type InventoryTransactionRow = typeof inventoryTransactions.$inferSelect;
export type PveNodeRow = typeof pveNodes.$inferSelect;
export type BattleSessionRow = typeof battleSessions.$inferSelect;
