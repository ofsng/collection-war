/**
 * Collection War — game rules.
 *
 * Pure, deterministic, framework-free. Every function here takes state and returns a
 * decision; none performs I/O, reads a clock, or draws ambient randomness.
 *
 * That is what lets the battle engine call them and stay replayable, and what lets the API
 * and the workers share one implementation of every formula. A formula that appears twice
 * will eventually disagree with itself and tell the player two different numbers.
 */

export * from './stats';
export * from './elements';
export * from './progression';
export * from './rewards';
