/**
 * The invariants any battle-engine implementation must satisfy.
 *
 * Written down before the first implementation existed, so that the engine was built against
 * them rather than having them retrofitted. They are asserted by the property tests in
 * `engine.test.ts`.
 *
 * The types this file used to declare now live in `./types`, alongside the implementation
 * they describe.
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
