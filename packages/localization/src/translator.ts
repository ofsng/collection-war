import { FALLBACK_LOCALE, type SupportedLocale } from '@collection-war/shared-types';
import { interpolate, type CatalogSet, type TranslationValues } from './catalog';
import { SHELL_MESSAGES } from './messages';

export interface Translator {
  readonly locale: SupportedLocale;
  /** Resolves a key for the active locale, falling back to English, then to the key itself. */
  t(key: string, values?: TranslationValues): string;
}

/**
 * Creates a translator.
 *
 * The three-step fallback exists so that a missing translation degrades in the least
 * damaging way available:
 *   1. the requested locale — the intended result;
 *   2. English — the player sees a real sentence in a language they may not prefer;
 *   3. the raw key — visibly broken, so it gets reported rather than shipped unnoticed.
 *
 * Step 3 never returns an empty string. A blank label looks deliberate and survives QA.
 */
export function createTranslator(locale: SupportedLocale, catalogs: CatalogSet = SHELL_MESSAGES): Translator {
  const primary = catalogs[locale];
  const fallback = catalogs[FALLBACK_LOCALE];

  return {
    locale,
    t(key, values) {
      const template = primary[key] ?? fallback[key] ?? key;
      return interpolate(template, values);
    },
  };
}
