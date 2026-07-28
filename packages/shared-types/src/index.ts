/**
 * Collection War — shared kernel.
 *
 * This package is the ONLY globally shared vocabulary in the monorepo. Everything here
 * is imported by nearly every other module, which means every addition raises the
 * coupling of the entire system.
 *
 * Admission test for a new type — it must satisfy ALL of:
 *   1. At least three unrelated domains genuinely need it.
 *   2. It has no behaviour beyond shape and trivial construction.
 *   3. It has no dependency on any framework, transport or storage concern.
 *   4. Changing it is expected to be rare.
 *
 * If a type describes what one domain owns (a Creature, a Listing, a BattleResult), it
 * belongs to that domain — not here. See docs/domains/SHARED_KERNEL.md.
 *
 * This package has ZERO runtime dependencies and must keep it that way.
 */

export * from './brand';
export * from './ids';
export * from './time';
export * from './locale';
export * from './money';
export * from './pagination';
export * from './result';
export * from './errors';
export * from './audit';
export * from './content-version';
