import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { validateRewardTable, type RewardTable } from '@collection-war/domain';
import { creatureSpecies, materialDefinitions, speciesAbilities } from '../schema/catalog';
import { pveNodes } from '../schema/gameplay';
import { SEED_MATERIALS, SEED_NODES, SEED_SPECIES, SLICE_CONTENT_VERSION } from './seed-content';

/**
 * Loads authored content into the database.
 *
 * IDEMPOTENT: loading the same version twice is a no-op. Content is published as a set and
 * keyed by version, so a re-run must not duplicate rows — and a seeding step that cannot be
 * safely re-run is a seeding step nobody dares run.
 *
 * VALIDATED ON LOAD: a malformed reward table is caught here, when publishing costs nothing,
 * rather than when a player receives -3 of something.
 */
export async function loadSliceContent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any drizzle database or transaction
  db: any,
  version: string = SLICE_CONTENT_VERSION,
): Promise<{ loaded: boolean; version: string }> {
  const existing = await db
    .select({ id: creatureSpecies.id })
    .from(creatureSpecies)
    .where(eq(creatureSpecies.contentVersion, version))
    .limit(1);

  if (existing.length > 0) {
    return { loaded: false, version };
  }

  // Validate before writing anything. Publishing a broken drop table is far more expensive
  // to undo than to prevent.
  const problems: string[] = [];
  for (const node of SEED_NODES) {
    for (const problem of validateRewardTable(node.rewards as RewardTable)) {
      problems.push(`${node.slug}: ${problem}`);
    }
    if (!SEED_SPECIES.some((species) => species.slug === node.opponentSpeciesSlug)) {
      problems.push(`${node.slug}: unknown opponent species "${node.opponentSpeciesSlug}"`);
    }
    for (const drop of node.rewards.drops) {
      if (!SEED_MATERIALS.some((material) => material.slug === drop.materialSlug)) {
        problems.push(`${node.slug}: unknown material "${drop.materialSlug}"`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Content validation failed for ${version}:\n  - ${problems.join('\n  - ')}`);
  }

  const speciesIds = new Map<string, string>();

  for (const species of SEED_SPECIES) {
    const id = randomUUID();
    speciesIds.set(species.slug, id);

    await db.insert(creatureSpecies).values({
      id,
      slug: species.slug,
      contentVersion: version,
      nameKey: species.nameKey,
      descriptionKey: species.descriptionKey,
      element: species.element,
      class: species.class,
      rarity: species.rarity,
      isStarter: species.isStarter ? 1 : 0,
      growth: species.growth,
      artKey: species.artKey,
    });

    for (const ability of species.abilities) {
      await db.insert(speciesAbilities).values({
        id: randomUUID(),
        speciesId: id,
        slug: ability.slug,
        nameKey: ability.nameKey,
        kind: ability.kind,
        powerBp: ability.powerBp,
        energyCost: ability.energyCost,
        burnChanceBp: ability.burnChanceBp,
        orderIndex: ability.orderIndex,
      });
    }
  }

  for (const material of SEED_MATERIALS) {
    await db.insert(materialDefinitions).values({
      id: randomUUID(),
      slug: material.slug,
      contentVersion: version,
      nameKey: material.nameKey,
      descriptionKey: material.descriptionKey,
      category: material.category,
      rarity: material.rarity,
      iconKey: material.iconKey,
    });
  }

  for (const node of SEED_NODES) {
    const opponentSpeciesId = speciesIds.get(node.opponentSpeciesSlug);
    if (opponentSpeciesId === undefined) {
      // Unreachable: validated above. Explicit rather than asserted, so a future edit to the
      // validation cannot silently turn this into an undefined foreign key.
      throw new Error(`Content bug: node ${node.slug} references unknown species`);
    }

    await db.insert(pveNodes).values({
      id: randomUUID(),
      slug: node.slug,
      contentVersion: version,
      chapterSlug: node.chapterSlug,
      biomeSlug: node.biomeSlug,
      nameKey: node.nameKey,
      descriptionKey: node.descriptionKey,
      orderIndex: node.orderIndex,
      requiresNodeSlug: node.requiresNodeSlug,
      opponentSpeciesId,
      opponentLevel: node.opponentLevel,
      rewards: node.rewards,
    });
  }

  return { loaded: true, version };
}
