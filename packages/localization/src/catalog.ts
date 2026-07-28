import type { SupportedLocale } from '@collection-war/shared-types';

/**
 * A translation catalogue is a flat map of dotted keys to strings.
 *
 * Flat rather than nested, deliberately: a nested object makes it impossible to tell at a
 * glance whether `en` and `tr-TR` cover the same keys, and it makes a missing translation
 * a runtime `undefined` deep in a lookup rather than an obvious absent key.
 */
export type Catalog = Readonly<Record<string, string>>;

export type CatalogSet = Readonly<Record<SupportedLocale, Catalog>>;

/**
 * Placeholder values substituted into a translated string.
 *
 * Values are formatted by the caller before substitution, because only the caller knows
 * whether a number is a count, a currency amount or a percentage — and those format
 * differently in the same locale.
 */
export type TranslationValues = Readonly<Record<string, string | number>>;

/**
 * Substitutes `{name}` placeholders.
 *
 * An unmatched placeholder is left visible rather than replaced with an empty string: a
 * literal `{playerName}` on screen is an obvious bug that gets reported, whereas a silent
 * blank looks like an intentional design and ships.
 */
export function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

/**
 * Reports keys present in the reference catalogue but missing from `candidate`.
 *
 * Used by the catalogue completeness test. Translation drift is invisible until a player
 * in one locale sees English text — this turns that into a failing test instead.
 */
export function findMissingKeys(reference: Catalog, candidate: Catalog): string[] {
  return Object.keys(reference)
    .filter((key) => !(key in candidate))
    .sort();
}
