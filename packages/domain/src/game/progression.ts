import { err, ok, type Result } from '@collection-war/shared-types';
import { DomainErrors } from '../errors';

/**
 * Creature levelling.
 *
 * The experience curve and the material gates that sit on top of it. Pure — the caller
 * supplies current state and material counts, and receives a decision.
 */

/** The level cap for the first vertical slice. Deliberately low, so the curve is testable. */
export const SLICE_LEVEL_CAP = 10;

/**
 * Experience required to advance FROM `level` to `level + 1`.
 *
 * Quadratic: `base * level^2 / scale`. Chosen over linear because a linear curve makes late
 * levels trivially fast, and over exponential because exponential makes them impossible
 * without a currency sink that does not exist yet.
 *
 * Integer arithmetic throughout, so the curve is identical on every platform.
 */
export function experienceForNextLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Level must be a positive integer, received: ${level}`);
  }

  return 50 + Math.floor((25 * level * level) / 2);
}

/** Cumulative experience needed to reach `level` from level 1. Used for display. */
export function totalExperienceForLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current += 1) {
    total += experienceForNextLevel(current);
  }
  return total;
}

/**
 * A material cost required to level up past a gate.
 *
 * Gates exist so that levelling consumes materials rather than only time — which is what
 * connects battle rewards to progression and gives materials a purpose.
 */
export interface LevelGate {
  readonly level: number;
  readonly materials: ReadonlyArray<{ readonly slug: string; readonly quantity: number }>;
}

/**
 * Level gates for the slice.
 *
 * The brief specifies gates at 10, 20, 30, 40 and 50. The slice caps at 10, so only the first
 * is reachable; the rest are declared so the shape is proven rather than invented later.
 */
export const LEVEL_GATES: readonly LevelGate[] = [
  { level: 5, materials: [{ slug: 'ember-seed', quantity: 2 }] },
  { level: 10, materials: [{ slug: 'fire-essence', quantity: 1 }] },
];

/** The gate that must be paid to advance FROM `level`, if any. */
export function gateForLevel(level: number): LevelGate | null {
  return LEVEL_GATES.find((gate) => gate.level === level) ?? null;
}

export interface LevelUpRequest {
  readonly currentLevel: number;
  readonly currentExperience: number;
  readonly availableMaterials: ReadonlyMap<string, number>;
  readonly levelCap?: number;
}

export interface LevelUpOutcome {
  readonly newLevel: number;
  /** Experience remaining after the requirement is deducted — carried, never discarded. */
  readonly remainingExperience: number;
  readonly consumedMaterials: ReadonlyArray<{ readonly slug: string; readonly quantity: number }>;
}

/**
 * Decides whether a creature may level up, and what it costs.
 *
 * Returns a `Result`: "not enough experience" is an ordinary outcome the caller must handle,
 * not an exception. See docs/constitution/ENGINEERING_PRINCIPLES.md.
 *
 * **Advances exactly one level per call.** Consuming a large experience pool in a single
 * request would skip the gates in between, which is precisely what the gates exist to
 * prevent.
 */
export function evaluateLevelUp(request: LevelUpRequest): Result<LevelUpOutcome> {
  const cap = request.levelCap ?? SLICE_LEVEL_CAP;

  if (request.currentLevel >= cap) {
    return DomainErrors.forbidden(`Creature is already at the level cap (${cap})`);
  }

  const required = experienceForNextLevel(request.currentLevel);

  if (request.currentExperience < required) {
    return err({
      category: 'PRECONDITION_FAILED',
      code: 'VALIDATION_FAILED',
      message: 'Not enough experience to level up',
      details: { required, available: request.currentExperience },
    });
  }

  const gate = gateForLevel(request.currentLevel);
  const consumed: Array<{ slug: string; quantity: number }> = [];

  if (gate) {
    for (const cost of gate.materials) {
      const available = request.availableMaterials.get(cost.slug) ?? 0;
      if (available < cost.quantity) {
        return DomainErrors.insufficientInventory(cost.slug, cost.quantity, available);
      }
      consumed.push({ slug: cost.slug, quantity: cost.quantity });
    }
  }

  return ok({
    newLevel: request.currentLevel + 1,
    remainingExperience: request.currentExperience - required,
    consumedMaterials: consumed,
  });
}
