import type { BattleEngineVersion } from '@collection-war/shared-types';

/**
 * The engine version stamped onto every battle result.
 *
 * WHEN TO CHANGE IT: any change that can produce a different outcome from identical
 * inputs — a formula, an ordering, a rounding rule, the order in which random values are
 * drawn. Refactors that provably cannot change output do not bump it.
 *
 * WHY IT MATTERS: a battle fought in March must still be replayable in September, under
 * March's rules. Without a recorded version, replay silently applies today's rules to
 * yesterday's fight and produces a different answer than the one the player saw — which
 * makes every dispute unresolvable.
 *
 * `0.0.0` means "no rules implemented yet", which is accurate.
 */
export const BATTLE_ENGINE_VERSION = '0.0.0' as BattleEngineVersion;

/**
 * Whether a result recorded under `version` can be replayed by this build.
 *
 * Once real versions exist this will consult a table of historical rule sets. Until then
 * it answers honestly rather than optimistically: only the current version is replayable.
 */
export function canReplay(version: BattleEngineVersion): boolean {
  return version === BATTLE_ENGINE_VERSION;
}
