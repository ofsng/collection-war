import type { SupportedLocale } from '@collection-war/shared-types';

/**
 * Locale-aware formatting, built on the platform's own `Intl` implementation.
 *
 * Everything here goes through `Intl` rather than manual string building. Turkish uses
 * `.` as a thousands separator and `,` as the decimal mark — the exact inverse of
 * English. Hand-rolled formatting produces numbers that are not merely ugly but wrong.
 */

/**
 * `Intl` formatter construction is measurably expensive and these are created per render.
 * Caching by (locale, options) keeps list screens from rebuilding the same formatter
 * hundreds of times.
 */
const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

function numberFormatter(locale: SupportedLocale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatCache.set(key, formatter);
  }
  return formatter;
}

function dateFormatter(locale: SupportedLocale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = dateFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatCache.set(key, formatter);
  }
  return formatter;
}

export function formatNumber(
  locale: SupportedLocale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return numberFormatter(locale, options ?? {}).format(value);
}

/**
 * Formats an integer amount of minor units.
 *
 * Note the parameter: MINOR units, as an integer. The division to a display value happens
 * here, at the very last moment, and nowhere else. Every layer beneath this one — API,
 * domain, ledger, database — deals only in integers, which is what keeps the economy
 * arithmetic exact. See docs/constitution/ECONOMY_INTEGRITY_RULES.md.
 */
export function formatCurrencyAmount(
  locale: SupportedLocale,
  minorUnits: number,
  precision: number,
  options?: { readonly isoCurrency?: string },
): string {
  const value = minorUnits / 10 ** precision;

  if (options?.isoCurrency) {
    return numberFormatter(locale, {
      style: 'currency',
      currency: options.isoCurrency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(value);
  }

  // Gameplay currencies are not ISO currencies. They are formatted as plain numbers and
  // labelled with their own icon or translated name by the caller.
  return numberFormatter(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

export function formatPercent(locale: SupportedLocale, ratio: number, fractionDigits = 0): string {
  return numberFormatter(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

export function formatDateTime(
  locale: SupportedLocale,
  isoTimestamp: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return dateFormatter(locale, options ?? { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(isoTimestamp),
  );
}

export function formatDate(locale: SupportedLocale, isoTimestamp: string): string {
  return dateFormatter(locale, { dateStyle: 'medium' }).format(new Date(isoTimestamp));
}

/**
 * Formats a duration as a compact countdown: `2g 4s`, `2d 4h`, `45m`, `30sn`.
 *
 * Used for expedition timers, cooldowns and listing expiry. Deliberately shows at most
 * two units — a countdown reading "1d 4h 22m 13s" changes every second and is harder to
 * read than "1d 4h".
 */
export function formatDuration(locale: SupportedLocale, durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const units =
    locale === 'tr-TR' ? { d: 'g', h: 's', m: 'dk', s: 'sn' } : { d: 'd', h: 'h', m: 'm', s: 's' };

  if (days > 0) return `${days}${units.d} ${hours}${units.h}`;
  if (hours > 0) return `${hours}${units.h} ${minutes}${units.m}`;
  if (minutes > 0) return `${minutes}${units.m} ${seconds}${units.s}`;
  return `${seconds}${units.s}`;
}

/**
 * Selects the plural category for a count.
 *
 * Turkish has a single plural form where English has two, so a template written as
 * `"{n} items"` cannot simply be translated word for word. Exposing the category lets
 * catalogues carry `key.one` / `key.other` and pick correctly per locale.
 */
export function pluralCategory(locale: SupportedLocale, count: number): Intl.LDMLPluralRule {
  return new Intl.PluralRules(locale).select(count);
}
