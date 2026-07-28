import type { ContentVersion } from '@collection-war/shared-types';

/**
 * Creature statistics and their derivation.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: effective stats are **derived, never stored**.
 *
 * A stored stat drifts out of sync with its content version the moment a balance change
 * ships. A derived stat is always correct for the version it is computed against — which is
 * what makes a battle from March replayable in September.
 *
 * All arithmetic is INTEGER. Fractional coefficients are expressed in basis points
 * (1 bp = 0.01%) and applied with an explicit floor, so two platforms cannot disagree in the
 * last bit of a float. See docs/architecture/RANDOMNESS_AND_REPLAY.md.
 */

/** One hundredth of a percent. 10000 bp = 100% = ×1. */
export const BASIS_POINTS = 10_000;

/**
 * Applies a basis-point coefficient with explicit floor rounding.
 *
 * Flooring is a stated decision rather than whatever IEEE-754 happened to do: it biases
 * every rounding in the defender's favour by at most one point, consistently.
 */
export function applyBp(value: number, bp: number): number {
  return Math.floor((value * bp) / BASIS_POINTS);
}

export interface Stats {
  /** Maximum hit points. */
  readonly health: number;
  /** Drives physical ability damage. */
  readonly attack: number;
  /** Reduces incoming damage. */
  readonly defense: number;
  /** Drives special ability damage and status application. */
  readonly focus: number;
  /** Determines turn order. */
  readonly speed: number;
  /** Reduces incoming status chance and duration. */
  readonly resistance: number;
  /** Critical chance, in basis points. */
  readonly critRate: number;
  /** Critical damage multiplier, in basis points (15000 = ×1.5). */
  readonly critPower: number;
  /** Element interaction strength, in basis points. */
  readonly affinity: number;
}

/**
 * The authored per-species growth definition.
 *
 * `base` is the value at level 1; `perLevel` is added for each level beyond it. Linear
 * growth is deliberate for the first release — it is predictable, easy to balance and easy
 * to explain to a player. A curve can be introduced later as a new content version without
 * touching any stored creature.
 */
export interface GrowthCurve {
  readonly base: Stats;
  readonly perLevel: Stats;
}

export interface EffectiveStatsInput {
  readonly growth: GrowthCurve;
  readonly level: number;
  /** Recorded on the result so an outcome can be tied to the data that produced it. */
  readonly contentVersion: ContentVersion;
}

/**
 * Computes a creature's effective stats.
 *
 * PURE. No I/O, no clock, no randomness — the battle engine calls this and stays
 * deterministic. Potential, stars, evolution and personality are future multipliers that
 * slot in here; they are absent because they are not in the first slice, not because they
 * were forgotten.
 */
export function computeEffectiveStats(input: EffectiveStatsInput): Stats {
  const { growth, level } = input;

  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Level must be a positive integer, received: ${level}`);
  }

  // Level 1 is the base value, so growth applies (level - 1) times.
  const steps = level - 1;

  const grow = (base: number, perLevel: number): number => base + perLevel * steps;

  return {
    health: grow(growth.base.health, growth.perLevel.health),
    attack: grow(growth.base.attack, growth.perLevel.attack),
    defense: grow(growth.base.defense, growth.perLevel.defense),
    focus: grow(growth.base.focus, growth.perLevel.focus),
    speed: grow(growth.base.speed, growth.perLevel.speed),
    resistance: grow(growth.base.resistance, growth.perLevel.resistance),
    // Rates do not grow with level. Uncapped critical growth would make late-game damage
    // scale multiplicatively with itself, which is how a balance curve runs away.
    critRate: growth.base.critRate,
    critPower: growth.base.critPower,
    affinity: growth.base.affinity,
  };
}

/**
 * Damage mitigation.
 *
 * `damage * K / (K + defense)` — a hyperbolic curve, chosen over flat subtraction because:
 *
 *   - it never reaches zero, so a high-defense creature is durable but not invulnerable;
 *   - it never goes negative, so no special case is needed;
 *   - it has diminishing returns, so stacking defense cannot trivialise the game.
 *
 * `K` is the defense value at which damage is halved. It lives in the versioned ruleset
 * rather than here, so it can be tuned without a code change.
 */
export function applyDefense(rawDamage: number, defense: number, mitigationConstant: number): number {
  if (defense <= 0) return rawDamage;

  return Math.floor((rawDamage * mitigationConstant) / (mitigationConstant + defense));
}
