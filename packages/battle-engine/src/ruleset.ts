import type { BattleEngineVersion } from '@collection-war/shared-types';

/**
 * The versioned battle ruleset.
 *
 * Every constant that can change an outcome lives here, in one reviewable object, rather
 * than scattered through handlers and UI components. That is what makes a rebalance a
 * content decision instead of a code archaeology exercise.
 *
 * CHANGING ANY VALUE HERE REQUIRES A NEW `version`. A battle recorded under `1.0.0` must
 * replay under `1.0.0`'s numbers, and `canReplay()` must answer honestly for anything else.
 */
export interface BattleRuleset {
  readonly version: BattleEngineVersion;

  /** Hard cap on turns. A battle that cannot end is a hung request and a stuck player. */
  readonly maxTurns: number;

  /** Energy every creature starts with. */
  readonly startingEnergy: number;
  readonly maxEnergy: number;
  /** Energy regained at the start of a creature's turn. */
  readonly energyPerTurn: number;
  /** Additional energy from using a basic attack — the reason to ever choose one. */
  readonly energyPerBasicAttack: number;

  /**
   * Defense value at which incoming damage is halved.
   * See `applyDefense` in @collection-war/domain for the curve and why it is hyperbolic.
   */
  readonly defenseMitigationConstant: number;

  /** Damage variance, in basis points either side of the computed value. 1000 = ±10%. */
  readonly damageVarianceBp: number;

  /** Floor on damage, so a heavily-mitigated hit still does something. */
  readonly minimumDamage: number;

  /** Multiplier applied when defending, in basis points. 5000 = half damage taken. */
  readonly defendMitigationBp: number;

  /** Energy gained by defending — defending is a resource decision, not only a defensive one. */
  readonly defendEnergyGain: number;

  /** Burn damage per turn, as a share of the target's maximum health, in basis points. */
  readonly burnDamagePerTurnBp: number;
  readonly burnDurationTurns: number;
}

/**
 * Ruleset `1.0.0` — the first release.
 *
 * The numbers are a starting point chosen to make the three starters feel distinct, not the
 * result of balance testing. They are expected to change, and the version is what makes
 * changing them safe.
 */
export const RULESET_1_0_0: BattleRuleset = {
  version: '1.0.0' as BattleEngineVersion,

  maxTurns: 50,

  startingEnergy: 20,
  maxEnergy: 100,
  energyPerTurn: 12,
  energyPerBasicAttack: 10,

  defenseMitigationConstant: 100,

  damageVarianceBp: 1_000,
  minimumDamage: 1,

  defendMitigationBp: 5_000,
  defendEnergyGain: 15,

  burnDamagePerTurnBp: 600,
  burnDurationTurns: 3,
};

/** Every ruleset this build can replay, keyed by version. */
const RULESETS: Readonly<Record<string, BattleRuleset>> = {
  '1.0.0': RULESET_1_0_0,
};

export const CURRENT_RULESET = RULESET_1_0_0;

/**
 * Resolves a ruleset by version.
 *
 * Returns `null` rather than falling back to the current ruleset. Replaying an old battle
 * under today's numbers produces a different answer than the player saw, presented as
 * authoritative — which is worse than admitting the battle cannot be replayed.
 */
export function rulesetForVersion(version: BattleEngineVersion): BattleRuleset | null {
  return RULESETS[version] ?? null;
}
