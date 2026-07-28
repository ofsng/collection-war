import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { schema, type DatabaseHandle } from '@collection-war/database';
import type { GrowthCurve } from '@collection-war/domain';
import type { Ability, BattleCreature } from '@collection-war/battle-engine';
import type { ContentVersion } from '@collection-war/shared-types';
import { TOKENS } from '../tokens';

/**
 * Content access.
 *
 * Content is authored data — species, abilities, materials, encounters — identical for every
 * player and immutable per version. That makes it the ideal cache, and the reason this
 * service exists rather than each caller querying directly.
 *
 * The cache is keyed by content version, so publishing a new version invalidates everything
 * at once. That is correct: content is published as a set, not row by row.
 */
@Injectable()
export class ContentService {
  private speciesCache = new Map<string, SpeciesContent[]>();

  constructor(@Inject(TOKENS.DATABASE) private readonly database: DatabaseHandle) {}

  /**
   * The content version currently in force.
   *
   * Resolved from the data rather than from configuration, so a deploy cannot disagree with
   * what was actually published.
   */
  async currentVersion(): Promise<ContentVersion> {
    const rows = await this.database.db
      .select({ version: schema.creatureSpecies.contentVersion })
      .from(schema.creatureSpecies)
      .orderBy(asc(schema.creatureSpecies.contentVersion))
      .limit(1);

    const version = rows[0]?.version;
    if (!version) {
      throw new Error('No content has been seeded. Run `pnpm db:seed` before starting the API.');
    }

    return version as ContentVersion;
  }

  async allSpecies(version: ContentVersion): Promise<SpeciesContent[]> {
    const cached = this.speciesCache.get(version);
    if (cached) return cached;

    const speciesRows = await this.database.db
      .select()
      .from(schema.creatureSpecies)
      .where(eq(schema.creatureSpecies.contentVersion, version));

    const abilityRows = await this.database.db
      .select()
      .from(schema.speciesAbilities)
      .orderBy(asc(schema.speciesAbilities.orderIndex));

    const species = speciesRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      nameKey: row.nameKey,
      descriptionKey: row.descriptionKey,
      element: row.element,
      class: row.class,
      rarity: row.rarity,
      isStarter: row.isStarter === 1,
      artKey: row.artKey,
      growth: row.growth as GrowthCurve,
      abilities: abilityRows
        .filter((ability) => ability.speciesId === row.id)
        .map((ability): Ability => ({
          slug: ability.slug,
          nameKey: ability.nameKey,
          kind: ability.kind as Ability['kind'],
          powerBp: ability.powerBp,
          energyCost: ability.energyCost,
          burnChanceBp: ability.burnChanceBp,
        })),
    }));

    this.speciesCache.set(version, species);
    return species;
  }

  async starters(version: ContentVersion): Promise<SpeciesContent[]> {
    return (await this.allSpecies(version)).filter((species) => species.isStarter);
  }

  async speciesById(version: ContentVersion, id: string): Promise<SpeciesContent | null> {
    return (await this.allSpecies(version)).find((species) => species.id === id) ?? null;
  }

  async speciesBySlug(version: ContentVersion, slug: string): Promise<SpeciesContent | null> {
    return (await this.allSpecies(version)).find((species) => species.slug === slug) ?? null;
  }

  /** Clears the cache. Called after a content publish; also used by tests. */
  invalidate(): void {
    this.speciesCache.clear();
  }
}

export interface SpeciesContent {
  readonly id: string;
  readonly slug: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly element: string;
  readonly class: string;
  readonly rarity: string;
  readonly isStarter: boolean;
  readonly artKey: string;
  readonly growth: GrowthCurve;
  readonly abilities: readonly Ability[];
}

/**
 * Builds the engine's view of a creature.
 *
 * Note what this does: it DERIVES stats from the species growth curve and the level. Stats
 * are never stored on the creature row, so they cannot drift out of sync with the content
 * version — see docs/architecture/GAME_ARCHITECTURE.md#stat-computation.
 */
export function toBattleCreature(
  instanceId: string,
  species: SpeciesContent,
  level: number,
  computeStats: (growth: GrowthCurve, level: number) => BattleCreature['stats'],
): BattleCreature {
  return {
    instanceId: instanceId as never,
    speciesSlug: species.slug,
    nameKey: species.nameKey,
    element: species.element as BattleCreature['element'],
    level,
    stats: computeStats(species.growth, level),
    abilities: species.abilities,
  };
}
