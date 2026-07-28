/**
 * Collection War — battle engine.
 *
 * This package will hold the complete, deterministic resolution of a battle. At bootstrap
 * it holds ONLY the contract and the determinism machinery; there is no combat logic, no
 * damage formula, no ability system and no creature data, because none of that has been
 * specified yet (docs/tasks/BACKLOG.md).
 *
 * The five properties this package must always have — they are the reason it is a
 * separate package rather than a folder inside the API:
 *
 *   1. FRAMEWORK-INDEPENDENT. No NestJS, no React, no database, no HTTP. Enforced by lint.
 *   2. DETERMINISTIC. Same inputs + same seed ⇒ byte-identical output, forever. No
 *      `Date.now()`, no `Math.random()`, no iteration over unordered collections.
 *   3. PURE. `resolve()` returns a result; it writes nothing and reads nothing external.
 *   4. SERVER-AUTHORITATIVE. It runs on the server. The client may run it to animate a
 *      result it has already been given, but never to decide one.
 *   5. VERSIONED. Every result records the engine version that produced it, so an old
 *      battle can be replayed under the rules it was actually fought under.
 *
 * See docs/domains/battle/README.md.
 */

export * from './contract';
export * from './version';
