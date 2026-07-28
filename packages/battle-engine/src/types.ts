import type {
  BattleEngineVersion,
  BattleId,
  ContentVersion,
  IsoTimestamp,
  OwnedCreatureId,
  PlayerId,
} from '@collection-war/shared-types';
import type { Element, Stats } from '@collection-war/domain';

/**
 * Battle types.
 *
 * ORDERING IS PART OF THE CONTRACT. Every collection here is an ordered array, never a Map
 * or Set, because iteration order over an unordered collection is the most common way a
 * "deterministic" engine quietly stops being one.
 */

export type AbilityKind = 'PHYSICAL' | 'SPECIAL' | 'HEAL' | 'BUFF';

export interface Ability {
  readonly slug: string;
  readonly nameKey: string;
  readonly kind: AbilityKind;
  /** Damage or healing coefficient in basis points. 10000 = 100% of the driving stat. */
  readonly powerBp: number;
  readonly energyCost: number;
  /** Chance to apply Burn, in basis points. 0 for abilities that do not. */
  readonly burnChanceBp: number;
}

/** A combatant as the engine receives it: fully resolved, with no lookups required. */
export interface BattleCreature {
  readonly instanceId: OwnedCreatureId;
  readonly speciesSlug: string;
  readonly nameKey: string;
  readonly element: Element;
  readonly level: number;
  readonly stats: Stats;
  /** Ordered. Index 0 is the basic attack and always costs zero energy. */
  readonly abilities: readonly Ability[];
}

export interface BattleParticipant {
  /** `null` for a PvE opponent, which has no owner. */
  readonly playerId: PlayerId | null;
  readonly side: 'A' | 'B';
  /** Ordered — this is the turn-order tiebreak and the targeting order. */
  readonly creatures: readonly BattleCreature[];
}

export interface BattleInput {
  readonly battleId: BattleId;
  /** Server-generated. Never supplied, seen in advance, or influenced by a client. */
  readonly seed: string;
  readonly contentVersion: ContentVersion;
  /** Server time, passed IN rather than read, so the engine stays pure. */
  readonly startedAt: IsoTimestamp;
  readonly participants: readonly BattleParticipant[];
}

export type BattleOutcome = 'SIDE_A' | 'SIDE_B' | 'DRAW';

/**
 * One entry in the replay log.
 *
 * The log serves three audiences, which is why it is worth its storage: the client animates
 * it, support explains a disputed result from it, and tests assert on it — which is far more
 * precise than asserting on a final winner.
 */
export interface BattleEvent {
  readonly turn: number;
  readonly sequence: number;
  readonly type:
    | 'battle_started'
    | 'turn_started'
    | 'ability_used'
    | 'basic_attack'
    | 'damage_dealt'
    | 'healed'
    | 'defended'
    | 'status_applied'
    | 'status_ticked'
    | 'creature_defeated'
    | 'battle_ended';
  readonly data: Readonly<Record<string, number | string | boolean>>;
}

export interface BattleResult {
  readonly battleId: BattleId;
  readonly outcome: BattleOutcome;
  readonly seed: string;
  readonly engineVersion: BattleEngineVersion;
  readonly contentVersion: ContentVersion;
  readonly turnCount: number;
  readonly events: readonly BattleEvent[];
  /** Final health per creature, ordered — for display and for tests. */
  readonly finalState: readonly {
    readonly instanceId: OwnedCreatureId;
    readonly side: 'A' | 'B';
    readonly remainingHealth: number;
    readonly maxHealth: number;
  }[];
}

/**
 * The engine.
 *
 * SYNCHRONOUS BY DESIGN. An async signature would permit — and eventually attract — an
 * `await` on a database or cache inside resolution, which is exactly what must never happen.
 * Keeping it sync makes the constraint structural rather than a convention someone remembers.
 */
export interface BattleEngine {
  readonly version: BattleEngineVersion;
  resolve(input: BattleInput): BattleResult;
}
