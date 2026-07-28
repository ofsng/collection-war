/**
 * Collection War — battle engine.
 *
 * Deterministic, server-authoritative battle resolution. Same inputs plus the same seed
 * produce byte-identical output, on any machine, in any process, forever.
 *
 * The five properties this package must always have, and why it is a separate package rather
 * than a folder inside the API:
 *
 *   1. FRAMEWORK-INDEPENDENT. No NestJS, React, database or HTTP. Enforced by lint.
 *   2. DETERMINISTIC. No `Date.now()`, no `Math.random()`, no iteration over an unordered
 *      collection. The first two are enforced by lint; the third by ordered types.
 *   3. PURE. `resolve()` returns a result; it writes nothing and reads nothing external.
 *   4. SERVER-AUTHORITATIVE. The client may replay a result to animate it, never to decide one.
 *   5. VERSIONED. Every result records the engine and content versions that produced it, so
 *      an old battle replays under the rules it was actually fought under.
 *
 * See docs/domains/battle/README.md and docs/architecture/RANDOMNESS_AND_REPLAY.md.
 */

export * from './types';
export * from './ruleset';
export * from './engine';
export * from './contract';
export * from './version';
