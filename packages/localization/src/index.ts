/**
 * Collection War — localization.
 *
 * Collection War ships in Turkish (`tr-TR`) and English (`en`) from day one, which is a
 * design constraint rather than a later feature. Two consequences shape this package:
 *
 *   - NO HARDCODED USER-FACING TEXT anywhere in an application. Every visible string
 *     comes from a translation key. This is enforced by review, and by the fact that the
 *     shells below contain no literal UI text at all.
 *
 *   - FORMATTING IS LOCALE-SENSITIVE, and getting it wrong is not cosmetic. `1.234,56` in
 *     Turkish is `1,234.56` in English; the same digits mean different numbers. Currency,
 *     dates, durations and percentages therefore go through this package, never through
 *     ad-hoc string concatenation.
 *
 * See docs/architecture/LOCALIZATION_ARCHITECTURE.md.
 */

export * from './catalog';
export * from './translator';
export * from './resolve';
export * from './format';
export * from './messages';
