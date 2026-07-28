import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type SupportedLocale,
} from '@collection-war/shared-types';

/**
 * Locale resolution and persistence.
 *
 * Ordering matters: an explicit choice by the player must always beat anything inferred.
 * Someone who switched to English on a Turkish device did so on purpose, and silently
 * overriding that on the next launch is a bug they cannot work around.
 */

/**
 * Resolves the locale to use, most authoritative source first.
 *
 * @param storedPreference an explicit past choice (cookie, SecureStore, profile setting)
 * @param acceptLanguage the browser's `Accept-Language` header
 * @param deviceLocales device locale list (mobile), most preferred first
 */
export function resolveLocale(
  storedPreference?: string | null,
  acceptLanguage?: string | null,
  deviceLocales?: readonly string[],
): SupportedLocale {
  if (isSupportedLocale(storedPreference)) return storedPreference;

  for (const candidate of deviceLocales ?? []) {
    const matched = matchLocale(candidate);
    if (matched) return matched;
  }

  if (acceptLanguage) {
    const matched = matchAcceptLanguage(acceptLanguage);
    if (matched) return matched;
  }

  return DEFAULT_LOCALE;
}

/**
 * Matches a BCP-47 tag against the supported set.
 *
 * Handles the common real-world cases: an exact tag (`tr-TR`), a bare language (`tr`),
 * and a regional variant we do not ship separately (`en-GB`, `tr-CY`). The comparison is
 * lowercased with an explicit `en` locale rather than the ambient one — Turkish's
 * dotless-i means `'I'.toLowerCase()` is `'ı'` under a Turkish locale, which would break
 * matching on exactly the platform this project targets.
 */
export function matchLocale(tag: string): SupportedLocale | null {
  const normalized = tag.toLowerCase();

  for (const supported of SUPPORTED_LOCALES) {
    if (normalized === supported.toLowerCase()) return supported;
  }

  const language = normalized.split('-')[0];
  for (const supported of SUPPORTED_LOCALES) {
    if (supported.toLowerCase().split('-')[0] === language) return supported;
  }

  return null;
}

/** Parses `Accept-Language`, honouring q-values. */
export function matchAcceptLanguage(header: string): SupportedLocale | null {
  const candidates = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const qParam = params.find((param) => param.trim().startsWith('q='));
      const quality = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const candidate of candidates) {
    const matched = matchLocale(candidate.tag);
    if (matched) return matched;
  }

  return null;
}

/**
 * Persistence is an INTERFACE, not an implementation.
 *
 * Web stores the preference in a cookie, mobile in SecureStore, admin in localStorage.
 * The shared package must not know which — that is what keeps it usable from all three.
 */
export interface LocaleStore {
  read(): Promise<SupportedLocale | null>;
  write(locale: SupportedLocale): Promise<void>;
}

export const LOCALE_STORAGE_KEY = 'collection_war.locale';
