import type { Brand } from './brand';

/**
 * Collection War ships in Turkish and English. See
 * docs/architecture/LOCALIZATION_ARCHITECTURE.md.
 */

export const SUPPORTED_LOCALES = ['tr-TR', 'en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** English is the fallback: a missing Turkish string degrades to English, never to a raw key. */
export const DEFAULT_LOCALE: SupportedLocale = 'tr-TR';
export const FALLBACK_LOCALE: SupportedLocale = 'en';

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * A dotted, stable identifier for a translatable string, e.g. `battle.result.victory`.
 *
 * Keys are stable API. Renaming one is a breaking change for every locale file and every
 * released mobile build that has not yet updated.
 */
export type TranslationKey = Brand<string, 'TranslationKey'>;

/**
 * Text that the server has already resolved for a specific locale.
 *
 * Most user-facing text is translated on the client from a key. This type exists for the
 * cases where it cannot be: content authored in the CMS, moderation messages, and
 * anything whose wording depends on server-side data the client must not see.
 */
export interface LocalizedText {
  readonly locale: SupportedLocale;
  readonly value: string;
}

/** Authored content carried in every supported locale at once, typically from the CMS. */
export type LocalizedRecord = Readonly<Record<SupportedLocale, string>>;
