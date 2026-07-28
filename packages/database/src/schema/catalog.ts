import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Creature catalog and material definitions — AUTHORED CONTENT.
 *
 * Rows are immutable per content version. Changing a species means publishing a new version,
 * never editing the existing row: a battle fought last month must replay under last month's
 * numbers, and an edited row makes that impossible.
 *
 * Written only by the admin content flow. Read by battle, owned-creatures and progression.
 */

export const creatureSpecies = pgTable(
  'creature_species',
  {
    id: uuid('id').primaryKey(),

    /** Stable human identifier — `koruk`. Used in seeds, admin URLs and test fixtures. */
    slug: text('slug').notNull(),
    contentVersion: text('content_version').notNull(),

    /**
     * Localization KEYS, never display text.
     *
     * `species.koruk.name` resolves per locale. Storing "Koruk" here would make a localized
     * string an identifier, which the localization architecture forbids.
     */
    nameKey: text('name_key').notNull(),
    descriptionKey: text('description_key').notNull(),

    element: text('element').notNull(),
    class: text('class').notNull(),
    rarity: text('rarity').notNull(),

    /** Whether this species is offered as a starter. */
    isStarter: integer('is_starter').notNull().default(0),

    /**
     * The growth curve, as authored: `{ base: Stats, perLevel: Stats }`.
     *
     * jsonb rather than 18 columns — it is read as a whole, never queried by component, and
     * adding a stat later must not require a migration on every species row.
     */
    growth: jsonb('growth').notNull(),

    artKey: text('art_key').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // A slug identifies one species WITHIN a content version. The same slug across versions
    // is the same creature, rebalanced.
    uniqueIndex('creature_species_slug_version_unique').on(table.slug, table.contentVersion),
    index('creature_species_version_idx').on(table.contentVersion),
  ],
);

export const speciesAbilities = pgTable(
  'species_abilities',
  {
    id: uuid('id').primaryKey(),
    speciesId: uuid('species_id')
      .notNull()
      .references(() => creatureSpecies.id),

    slug: text('slug').notNull(),
    nameKey: text('name_key').notNull(),

    /** PHYSICAL | SPECIAL | HEAL | BUFF */
    kind: text('kind').notNull(),

    /** Coefficient in basis points. Integer, so no float reaches the damage pipeline. */
    powerBp: integer('power_bp').notNull(),
    energyCost: integer('energy_cost').notNull().default(0),
    burnChanceBp: integer('burn_chance_bp').notNull().default(0),

    /** Ordered. Index 0 is the basic attack and always costs zero energy. */
    orderIndex: integer('order_index').notNull(),
  },
  (table) => [
    uniqueIndex('species_abilities_species_slug_unique').on(table.speciesId, table.slug),
    index('species_abilities_species_idx').on(table.speciesId, table.orderIndex),
  ],
);

export const materialDefinitions = pgTable(
  'material_definitions',
  {
    id: uuid('id').primaryKey(),
    slug: text('slug').notNull(),
    contentVersion: text('content_version').notNull(),

    nameKey: text('name_key').notNull(),
    descriptionKey: text('description_key').notNull(),

    /** ESSENCE | ORGANIC | MINERAL | BOTANICAL | CATALYST */
    category: text('category').notNull(),
    /** RAW | REFINED | PURE | ANCIENT | PRIMAL | PERFECT */
    rarity: text('rarity').notNull(),

    iconKey: text('icon_key').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('material_definitions_slug_version_unique').on(table.slug, table.contentVersion)],
);

export type CreatureSpeciesRow = typeof creatureSpecies.$inferSelect;
export type SpeciesAbilityRow = typeof speciesAbilities.$inferSelect;
export type MaterialDefinitionRow = typeof materialDefinitions.$inferSelect;
