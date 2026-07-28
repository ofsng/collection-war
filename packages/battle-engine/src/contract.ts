import type {
  BattleEngineVersion,
  BattleId,
  ContentVersion,
  IsoTimestamp,
  OwnedCreatureId,
  PlayerId,
} from '@collection-war/shared-types';

/**
 * The battle engine's public contract.
 *
 * These types define the SHAPE of battle resolution without committing to any rules. They
 * exist now so that the API, the workers and the clients can be designed against a stable
 * boundary while the rules themselves are still being specified.
 *
 * Everything below is intentionally free of stats, elements, abilities and damage — those
 * are game design, and inventing them here would be exactly the premature implementation
 * this bootstrap is meant to prevent.
 */

/**
 * Everything the engine needs, and nothing else.
 *
 * Note what is absent: no repository, no logger, no clock, no configuration. If resolving
 * a battle required any of those, the result would depend on something outside its inputs
 * and would stop being reproducible.
 */
export interface BattleInput {
  readonly battleId: BattleId;
  /** Persisted with the result. Replaying with this seed must reproduce it exactly. */
  readonly seed: string;
  /** Which balance data this battle was fought under. */
  readonly contentVersion: ContentVersion;
  /** Server time, passed IN rather than read, so the engine stays pure. */
  readonly startedAt: IsoTimestamp;
  readonly participants: readonly BattleParticipant[];
}

export interface BattleParticipant {
  readonly playerId: PlayerId | null; // null for PvE opponents
  readonly side: 'A' | 'B';
  /**
   * Ordered. Order is part of the input, never derived from a map or set iteration —
   * unordered iteration is the most common way a "deterministic" engine stops being one.
   */
  readonly creatures: readonly OwnedCreatureId[];
}

export type BattleOutcome = 'SIDE_A' | 'SIDE_B' | 'DRAW';

/**
 * The result of a battle.
 *
 * `events` is the replay log: the ordered list of everything that happened, sufficient for
 * a client to animate the battle and for support to explain it. The client receives the
 * result and plays it back; it never computes it.
 */
export interface BattleResult {
  readonly battleId: BattleId;
  readonly outcome: BattleOutcome;
  readonly seed: string;
  readonly engineVersion: BattleEngineVersion;
  readonly contentVersion: ContentVersion;
  readonly turnCount: number;
  readonly events: readonly BattleEvent[];
}

export interface BattleEvent {
  readonly turn: number;
  readonly sequence: number;
  readonly type: string;
  readonly data: Readonly<Record<string, number | string | boolean>>;
}

/**
 * The engine itself.
 *
 * Synchronous by design. An async signature would permit — and eventually attract — an
 * `await` on a database or a cache inside resolution, which is precisely what must never
 * happen. Keeping it sync makes the constraint structural rather than a convention.
 */
export interface BattleEngine {
  readonly version: BattleEngineVersion;
  resolve(input: BattleInput): BattleResult;
}

/**
 * The invariants any implementation must satisfy.
 *
 * Written down now, with no implementation to satisfy them, so that the first real engine
 * is built against them rather than having them retrofitted. They become the property
 * tests described in docs/domains/battle/README.md.
 */
export const BATTLE_ENGINE_INVARIANTS = [
  'Identical input and seed always produce an identical result, on any machine, in any process.',
  'Resolution performs no I/O: no network, no filesystem, no database, no clock, no ambient randomness.',
  'Every random draw comes from the seeded RandomSource derived from BattleInput.seed.',
  'Turn count is bounded; no input can produce an unbounded loop.',
  'The event log is sufficient to reconstruct the outcome without re-running resolution.',
  'The engine never mutates its input.',
  'Resolution never depends on iteration order of a Map, Set or object key list.',
] as const;
