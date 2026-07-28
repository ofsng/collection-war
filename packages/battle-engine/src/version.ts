import type { BattleEngineVersion } from '@collection-war/shared-types';
import { rulesetForVersion, CURRENT_RULESET } from './ruleset';

/**
 * The engine version stamped onto every battle result.
 *
 * WHEN TO CHANGE IT: any change that can produce a different outcome from identical inputs —
 * a formula, an ordering, a rounding rule, the order in which random values are drawn.
 * Refactors that provably cannot change output do not bump it.
 *
 * WHY IT MATTERS: a battle fought in March must still be replayable in September, under
 * March's rules. Without a recorded version, replay silently applies today's rules to
 * yesterday's fight and produces a different answer than the player saw — which makes every
 * dispute unresolvable.
 */
export const BATTLE_ENGINE_VERSION = CURRENT_RULESET.version;

/**
 * Whether a result recorded under `version` can be replayed by this build.
 *
 * Answers from the ruleset register, so it is true for every historical ruleset this build
 * still carries — and honestly false for anything it does not.
 */
export function canReplay(version: BattleEngineVersion): boolean {
  return rulesetForVersion(version) !== null;
}
