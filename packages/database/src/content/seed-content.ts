import type { GrowthCurve } from '@collection-war/domain';

/**
 * Content version `2026.07.28-1` — the first playable slice.
 *
 * AUTHORED CONTENT AS DATA. Nothing here is hardcoded in a handler: it is loaded into the
 * database, versioned, and read through `ContentService`. That is what makes a rebalance a
 * content decision rather than a deploy — see docs/architecture/CONTENT_VERSIONING.md.
 *
 * Names and descriptions are localization KEYS. `species.koruk.name` resolves per locale;
 * `koruk` is the identifier. A localized string is never an identifier.
 *
 * SCOPE: 3 species, 4 materials, 3 nodes. The release targets 60 species and 80 materials —
 * building them before the loop works would be exactly the premature content the brief
 * forbids.
 */

export const SLICE_CONTENT_VERSION = '2026.07.28-1';

interface StatBlock {
  health: number;
  attack: number;
  defense: number;
  focus: number;
  speed: number;
  resistance: number;
  critRate: number;
  critPower: number;
  affinity: number;
}

function growth(base: StatBlock, perLevel: Partial<StatBlock>): GrowthCurve {
  return {
    base,
    perLevel: {
      health: 0,
      attack: 0,
      defense: 0,
      focus: 0,
      speed: 0,
      resistance: 0,
      critRate: 0,
      critPower: 0,
      affinity: 0,
      ...perLevel,
    },
  };
}

export interface SeedAbility {
  slug: string;
  nameKey: string;
  kind: 'PHYSICAL' | 'SPECIAL' | 'HEAL' | 'BUFF';
  powerBp: number;
  energyCost: number;
  burnChanceBp: number;
  orderIndex: number;
}

export interface SeedSpecies {
  slug: string;
  nameKey: string;
  descriptionKey: string;
  element: string;
  class: string;
  rarity: string;
  isStarter: boolean;
  artKey: string;
  growth: GrowthCurve;
  abilities: SeedAbility[];
}

/**
 * The three starters.
 *
 * They must teach three different lessons, which is why their numbers differ in kind rather
 * than in degree:
 *
 *   Koruk  — durable Fire Guardian. Teaches defence and trading turns.
 *   Mizu   — Water Healer. Teaches sustain and energy management.
 *   Veyra  — fast Air Raider. Teaches turn order and critical damage.
 *
 * A player who picks any of them should experience a different fight, not the same fight with
 * different numbers.
 */
export const SEED_SPECIES: SeedSpecies[] = [
  {
    slug: 'koruk',
    nameKey: 'species.koruk.name',
    descriptionKey: 'species.koruk.description',
    element: 'FIRE',
    class: 'GUARDIAN',
    rarity: 'COMMON',
    isStarter: true,
    artKey: 'koruk',
    growth: growth(
      {
        health: 260,
        attack: 46,
        defense: 52,
        focus: 30,
        speed: 34,
        resistance: 30,
        critRate: 400,
        critPower: 15_000,
        affinity: 100,
      },
      { health: 22, attack: 4, defense: 5, focus: 2, speed: 2, resistance: 2 },
    ),
    abilities: [
      {
        slug: 'ember-strike',
        nameKey: 'ability.ember-strike.name',
        kind: 'PHYSICAL',
        powerBp: 9_000,
        energyCost: 0,
        burnChanceBp: 0,
        orderIndex: 0,
      },
      {
        slug: 'molten-guard',
        nameKey: 'ability.molten-guard.name',
        kind: 'PHYSICAL',
        powerBp: 14_000,
        energyCost: 25,
        burnChanceBp: 2_500,
        orderIndex: 1,
      },
      {
        slug: 'cinder-crush',
        nameKey: 'ability.cinder-crush.name',
        kind: 'PHYSICAL',
        powerBp: 20_000,
        energyCost: 45,
        burnChanceBp: 4_000,
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'mizu',
    nameKey: 'species.mizu.name',
    descriptionKey: 'species.mizu.description',
    element: 'WATER',
    class: 'HEALER',
    rarity: 'COMMON',
    isStarter: true,
    artKey: 'mizu',
    growth: growth(
      {
        health: 220,
        attack: 34,
        defense: 38,
        focus: 54,
        speed: 42,
        resistance: 40,
        critRate: 500,
        critPower: 15_000,
        affinity: 120,
      },
      { health: 18, attack: 2, defense: 3, focus: 5, speed: 3, resistance: 3 },
    ),
    abilities: [
      {
        slug: 'tide-slap',
        nameKey: 'ability.tide-slap.name',
        kind: 'PHYSICAL',
        powerBp: 8_000,
        energyCost: 0,
        burnChanceBp: 0,
        orderIndex: 0,
      },
      {
        slug: 'restoring-current',
        nameKey: 'ability.restoring-current.name',
        kind: 'HEAL',
        powerBp: 11_000,
        energyCost: 30,
        burnChanceBp: 0,
        orderIndex: 1,
      },
      {
        slug: 'pressure-burst',
        nameKey: 'ability.pressure-burst.name',
        kind: 'SPECIAL',
        powerBp: 18_000,
        energyCost: 40,
        burnChanceBp: 0,
        orderIndex: 2,
      },
    ],
  },
  {
    slug: 'veyra',
    nameKey: 'species.veyra.name',
    descriptionKey: 'species.veyra.description',
    element: 'AIR',
    class: 'RAIDER',
    rarity: 'COMMON',
    isStarter: true,
    artKey: 'veyra',
    growth: growth(
      {
        health: 190,
        attack: 56,
        defense: 30,
        focus: 40,
        speed: 68,
        resistance: 24,
        critRate: 1_200,
        critPower: 18_000,
        affinity: 110,
      },
      { health: 15, attack: 5, defense: 2, focus: 3, speed: 5, resistance: 1 },
    ),
    abilities: [
      {
        slug: 'gale-cut',
        nameKey: 'ability.gale-cut.name',
        kind: 'PHYSICAL',
        powerBp: 9_500,
        energyCost: 0,
        burnChanceBp: 0,
        orderIndex: 0,
      },
      {
        slug: 'updraft',
        nameKey: 'ability.updraft.name',
        kind: 'SPECIAL',
        powerBp: 13_000,
        energyCost: 22,
        burnChanceBp: 0,
        orderIndex: 1,
      },
      {
        slug: 'storm-lash',
        nameKey: 'ability.storm-lash.name',
        kind: 'PHYSICAL',
        powerBp: 19_000,
        energyCost: 42,
        burnChanceBp: 0,
        orderIndex: 2,
      },
    ],
  },

  /**
   * The tutorial opponent. Not a starter, deliberately weak, and Nature — so a Fire starter
   * sees "super effective" and a Water starter does not. The first battle should teach that
   * elements matter.
   */
  {
    slug: 'cinder-sprout',
    nameKey: 'species.cinder-sprout.name',
    descriptionKey: 'species.cinder-sprout.description',
    element: 'NATURE',
    class: 'GUARDIAN',
    rarity: 'COMMON',
    isStarter: false,
    artKey: 'cinder-sprout',
    growth: growth(
      {
        health: 120,
        attack: 26,
        defense: 20,
        focus: 20,
        speed: 28,
        resistance: 12,
        critRate: 200,
        critPower: 13_000,
        affinity: 80,
      },
      { health: 10, attack: 2, defense: 1, focus: 1, speed: 1, resistance: 1 },
    ),
    abilities: [
      {
        slug: 'thorn-jab',
        nameKey: 'ability.thorn-jab.name',
        kind: 'PHYSICAL',
        powerBp: 7_000,
        energyCost: 0,
        burnChanceBp: 0,
        orderIndex: 0,
      },
    ],
  },
];

export interface SeedMaterial {
  slug: string;
  nameKey: string;
  descriptionKey: string;
  category: string;
  rarity: string;
  iconKey: string;
}

/** Four Crimson Rift materials — enough to feed the level gates without inventing a economy. */
export const SEED_MATERIALS: SeedMaterial[] = [
  {
    slug: 'ember-seed',
    nameKey: 'material.ember-seed.name',
    descriptionKey: 'material.ember-seed.description',
    category: 'BOTANICAL',
    rarity: 'RAW',
    iconKey: 'ember-seed',
  },
  {
    slug: 'fire-essence',
    nameKey: 'material.fire-essence.name',
    descriptionKey: 'material.fire-essence.description',
    category: 'ESSENCE',
    rarity: 'RAW',
    iconKey: 'fire-essence',
  },
  {
    slug: 'magma-shell',
    nameKey: 'material.magma-shell.name',
    descriptionKey: 'material.magma-shell.description',
    category: 'ORGANIC',
    rarity: 'RAW',
    iconKey: 'magma-shell',
  },
  {
    slug: 'volcanic-glass',
    nameKey: 'material.volcanic-glass.name',
    descriptionKey: 'material.volcanic-glass.description',
    category: 'MINERAL',
    rarity: 'REFINED',
    iconKey: 'volcanic-glass',
  },
];

export interface SeedNode {
  slug: string;
  chapterSlug: string;
  biomeSlug: string;
  nameKey: string;
  descriptionKey: string;
  orderIndex: number;
  requiresNodeSlug: string | null;
  opponentSpeciesSlug: string;
  opponentLevel: number;
  rewards: {
    experience: number;
    drops: Array<{ materialSlug: string; chanceBp: number; minQuantity: number; maxQuantity: number }>;
  };
}

/**
 * Crimson Rift, chapter 1 — three nodes.
 *
 * Node 1 is deliberately winnable by any starter at level 1: a first battle that can be lost
 * to bad luck teaches the wrong lesson. Nodes 2 and 3 escalate and are gated on the previous
 * clear, which is enforced server-side.
 */
export const SEED_NODES: SeedNode[] = [
  {
    slug: 'crimson-rift-1-1',
    chapterSlug: 'crimson-rift-1',
    biomeSlug: 'crimson-rift',
    nameKey: 'pve.crimson-rift-1-1.name',
    descriptionKey: 'pve.crimson-rift-1-1.description',
    orderIndex: 1,
    requiresNodeSlug: null,
    opponentSpeciesSlug: 'cinder-sprout',
    opponentLevel: 1,
    rewards: {
      experience: 120,
      drops: [{ materialSlug: 'ember-seed', chanceBp: 10_000, minQuantity: 1, maxQuantity: 2 }],
    },
  },
  {
    slug: 'crimson-rift-1-2',
    chapterSlug: 'crimson-rift-1',
    biomeSlug: 'crimson-rift',
    nameKey: 'pve.crimson-rift-1-2.name',
    descriptionKey: 'pve.crimson-rift-1-2.description',
    orderIndex: 2,
    requiresNodeSlug: 'crimson-rift-1-1',
    opponentSpeciesSlug: 'cinder-sprout',
    opponentLevel: 3,
    rewards: {
      experience: 180,
      drops: [
        { materialSlug: 'ember-seed', chanceBp: 10_000, minQuantity: 1, maxQuantity: 3 },
        { materialSlug: 'magma-shell', chanceBp: 4_000, minQuantity: 1, maxQuantity: 1 },
      ],
    },
  },
  {
    slug: 'crimson-rift-1-3',
    chapterSlug: 'crimson-rift-1',
    biomeSlug: 'crimson-rift',
    nameKey: 'pve.crimson-rift-1-3.name',
    descriptionKey: 'pve.crimson-rift-1-3.description',
    orderIndex: 3,
    requiresNodeSlug: 'crimson-rift-1-2',
    opponentSpeciesSlug: 'cinder-sprout',
    opponentLevel: 5,
    rewards: {
      experience: 260,
      drops: [
        { materialSlug: 'ember-seed', chanceBp: 10_000, minQuantity: 2, maxQuantity: 4 },
        { materialSlug: 'fire-essence', chanceBp: 3_000, minQuantity: 1, maxQuantity: 1 },
        { materialSlug: 'volcanic-glass', chanceBp: 1_000, minQuantity: 1, maxQuantity: 1 },
      ],
    },
  },
];
