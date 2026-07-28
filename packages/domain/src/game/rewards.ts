import type { RandomSource } from '@collection-war/shared-types';

/**
 * Reward resolution.
 *
 * PURE and SEEDED. The same seed always produces the same drops, which is what makes
 * "why did this player get four rares in a row?" an answerable question rather than a guess.
 *
 * The client never computes a reward, never sees a drop table for content it has not
 * reached, and never states what it won.
 */

/** An authored drop entry. */
export interface DropTableEntry {
  readonly materialSlug: string;
  /** Probability in basis points. 10000 = guaranteed. */
  readonly chanceBp: number;
  readonly minQuantity: number;
  readonly maxQuantity: number;
}

export interface RewardTable {
  readonly experience: number;
  readonly drops: readonly DropTableEntry[];
}

export interface GrantedMaterial {
  readonly materialSlug: string;
  readonly quantity: number;
}

export interface ResolvedRewards {
  readonly experience: number;
  readonly materials: readonly GrantedMaterial[];
}

/**
 * Resolves a reward table into concrete rewards.
 *
 * Iterates the table **in order** using a single seeded stream. Order matters: it is what
 * makes the result reproducible. Iterating an unordered collection here would silently break
 * determinism — the most common way a "deterministic" system stops being one.
 *
 * Quantities for the same material are merged, so a caller never has to handle duplicates.
 */
export function resolveRewards(table: RewardTable, random: RandomSource): ResolvedRewards {
  const granted = new Map<string, number>();

  for (const entry of table.drops) {
    // Draw for every entry, whether or not it hits. Drawing only on a hit would make the
    // stream position depend on earlier outcomes, so adding an entry would shift everything
    // after it — and every recorded result would replay differently.
    const roll = random.nextInt(1, 10_000);
    if (roll > entry.chanceBp) continue;

    const quantity =
      entry.minQuantity === entry.maxQuantity
        ? entry.minQuantity
        : random.nextInt(entry.minQuantity, entry.maxQuantity);

    if (quantity > 0) {
      granted.set(entry.materialSlug, (granted.get(entry.materialSlug) ?? 0) + quantity);
    }
  }

  return {
    experience: table.experience,
    // Sorted, so the output is stable regardless of Map insertion order.
    materials: [...granted.entries()]
      .map(([materialSlug, quantity]) => ({ materialSlug, quantity }))
      .sort((a, b) => a.materialSlug.localeCompare(b.materialSlug, 'en')),
  };
}

/**
 * Validates a drop table at content-load time.
 *
 * Catching a malformed table when content is published is far cheaper than discovering it
 * when a player receives -3 of something.
 */
export function validateRewardTable(table: RewardTable): string[] {
  const problems: string[] = [];

  if (!Number.isInteger(table.experience) || table.experience < 0) {
    problems.push(`experience must be a non-negative integer, got ${table.experience}`);
  }

  for (const entry of table.drops) {
    if (!Number.isInteger(entry.chanceBp) || entry.chanceBp < 1 || entry.chanceBp > 10_000) {
      problems.push(`${entry.materialSlug}: chanceBp must be in [1, 10000], got ${entry.chanceBp}`);
    }
    if (!Number.isInteger(entry.minQuantity) || entry.minQuantity < 1) {
      problems.push(`${entry.materialSlug}: minQuantity must be >= 1, got ${entry.minQuantity}`);
    }
    if (entry.maxQuantity < entry.minQuantity) {
      problems.push(`${entry.materialSlug}: maxQuantity < minQuantity`);
    }
  }

  return problems;
}
