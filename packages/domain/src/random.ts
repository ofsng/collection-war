import type { RandomSource } from '@collection-war/shared-types';

/**
 * Deterministic randomness.
 *
 * Every random outcome in Collection War — a battle's damage roll, an expedition's loot,
 * a creature's generated stats — is produced by a seeded PRNG whose seed is persisted
 * with the result. Three things follow, and all three matter:
 *
 *   1. AUDITABILITY. "Why did I lose that battle?" and "why did this player get four
 *      rares in a row?" are answerable by replaying the seed.
 *   2. TESTABILITY. Balance and invariant tests can assert on exact outcomes.
 *   3. ANTI-CHEAT. The client cannot predict or influence a roll it does not seed.
 *
 * NOT FOR SECURITY. This is `mulberry32`: fast, small, statistically fine for gameplay,
 * and completely predictable given the seed — that is the entire point. Anything that
 * must be unguessable (tokens, password resets, idempotency salts) uses
 * `node:crypto.randomUUID` / `randomBytes` instead.
 */

/**
 * Hashes an arbitrary string seed into a 32-bit integer.
 *
 * FNV-1a: not cryptographic, but well-distributed enough that similar seeds
 * (`battle-1`, `battle-2`) produce unrelated streams rather than correlated ones.
 */
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function createSeededRandom(seed: string): RandomSource {
  let state = hashSeed(seed);

  const next = (): number => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    seed,
    next,
    nextInt(minInclusive, maxInclusive) {
      if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
        throw new Error('nextInt bounds must be integers');
      }
      if (maxInclusive < minInclusive) {
        throw new Error(`nextInt received an inverted range: [${minInclusive}, ${maxInclusive}]`);
      }
      return minInclusive + Math.floor(next() * (maxInclusive - minInclusive + 1));
    },
  };
}

/**
 * Derives an independent stream from a parent seed.
 *
 * Needed because a single battle draws randomness for several purposes. If they shared
 * one stream, adding a new roll anywhere would shift every subsequent outcome, and every
 * previously recorded battle would replay differently after the change.
 */
export function deriveSeed(parentSeed: string, purpose: string): string {
  return `${parentSeed}:${purpose}`;
}
