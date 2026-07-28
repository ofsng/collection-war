import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '@collection-war/shared-types';
import { findMissingKeys, interpolate } from './catalog';
import { SHELL_MESSAGES } from './messages';
import { createTranslator } from './translator';
import { matchAcceptLanguage, matchLocale, resolveLocale } from './resolve';
import { formatCurrencyAmount, formatDuration, formatNumber, formatPercent, pluralCategory } from './format';

describe('catalogue completeness', () => {
  it('translates every English key into Turkish', () => {
    // Guards against the most common localization defect: a key added to `en` during a
    // feature and never translated, which ships as English text to Turkish players.
    const missing = findMissingKeys(SHELL_MESSAGES.en, SHELL_MESSAGES['tr-TR']);

    expect(missing, `Missing tr-TR translations: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no Turkish keys that English lacks', () => {
    // English is the reference catalogue and the fallback. A key missing from it would
    // fall through to the raw key for English players.
    const extra = findMissingKeys(SHELL_MESSAGES['tr-TR'], SHELL_MESSAGES.en);

    expect(extra, `Keys missing from the en reference catalogue: ${extra.join(', ')}`).toEqual([]);
  });

  it('has no empty translations', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const [key, value] of Object.entries(SHELL_MESSAGES[locale])) {
        expect(value.trim(), `${locale}:${key} is empty`).not.toBe('');
      }
    }
  });
});

describe('translator', () => {
  it('returns the string for the active locale', () => {
    expect(createTranslator('tr-TR').t('system.title')).toBe('Sistem durumu');
    expect(createTranslator('en').t('system.title')).toBe('System status');
  });

  it('falls back to English rather than showing nothing', () => {
    const catalogs = {
      en: { 'only.in.english': 'English text' },
      'tr-TR': {},
    };

    expect(createTranslator('tr-TR', catalogs).t('only.in.english')).toBe('English text');
  });

  it('returns the key itself when no catalogue has it', () => {
    // Visibly broken beats invisibly blank: a literal key on screen gets reported.
    expect(createTranslator('en').t('does.not.exist')).toBe('does.not.exist');
  });

  it('interpolates named placeholders', () => {
    expect(interpolate('Merhaba {name}!', { name: 'Ada' })).toBe('Merhaba Ada!');
  });

  it('leaves an unmatched placeholder visible', () => {
    expect(interpolate('Merhaba {name}!', { other: 'x' })).toBe('Merhaba {name}!');
  });
});

describe('locale resolution', () => {
  it('prefers an explicit stored choice over everything else', () => {
    // Someone who chose English on a Turkish phone meant it.
    expect(resolveLocale('en', 'tr-TR,tr;q=0.9', ['tr-TR'])).toBe('en');
  });

  it('falls back to device locales when there is no stored choice', () => {
    expect(resolveLocale(null, null, ['en-GB', 'tr-TR'])).toBe('en');
  });

  it('falls back to Accept-Language when there is no device locale', () => {
    expect(resolveLocale(null, 'tr-TR,tr;q=0.9,en;q=0.8')).toBe('tr-TR');
  });

  it('defaults to Turkish when nothing is known', () => {
    expect(resolveLocale()).toBe('tr-TR');
  });

  it('ignores an unsupported stored value instead of trusting it', () => {
    // The stored value is attacker-influenced on the client; it must be re-validated.
    expect(resolveLocale('de-DE', null, ['en'])).toBe('en');
  });

  it('matches regional variants to the closest supported locale', () => {
    expect(matchLocale('en-GB')).toBe('en');
    expect(matchLocale('tr-CY')).toBe('tr-TR');
    expect(matchLocale('TR')).toBe('tr-TR');
    expect(matchLocale('de')).toBeNull();
  });

  it('honours Accept-Language q-values', () => {
    expect(matchAcceptLanguage('de;q=1.0,en;q=0.8,tr;q=0.9')).toBe('tr-TR');
  });

  it('ignores entries with q=0', () => {
    expect(matchAcceptLanguage('tr;q=0,en;q=0.5')).toBe('en');
  });
});

describe('formatting', () => {
  it('formats numbers with the correct separators per locale', () => {
    // The core reason this package exists: these two are inverses of each other.
    expect(formatNumber('tr-TR', 1234567.89, { maximumFractionDigits: 2 })).toBe('1.234.567,89');
    expect(formatNumber('en', 1234567.89, { maximumFractionDigits: 2 })).toBe('1,234,567.89');
  });

  it('formats a gameplay currency from integer minor units', () => {
    // 1500 whole gold, precision 0 — no decimal point anywhere.
    expect(formatCurrencyAmount('tr-TR', 1500, 0)).toBe('1.500');
    expect(formatCurrencyAmount('en', 1500, 0)).toBe('1,500');
  });

  it('formats fiat from minor units with two decimals', () => {
    // 12345 kuruş is 123,45 TRY. The division happens only here.
    const formatted = formatCurrencyAmount('tr-TR', 12345, 2, { isoCurrency: 'TRY' });

    expect(formatted).toContain('123,45');
  });

  it('formats percentages from a ratio', () => {
    expect(formatPercent('en', 0.755, 1)).toBe('75.5%');
  });

  it('formats durations with localized unit labels, at most two units', () => {
    const oneDayFourHours = (24 + 4) * 3600 * 1000;

    expect(formatDuration('tr-TR', oneDayFourHours)).toBe('1g 4s');
    expect(formatDuration('en', oneDayFourHours)).toBe('1d 4h');
    expect(formatDuration('en', 45 * 1000)).toBe('45s');
  });

  it('clamps a negative duration to zero rather than showing a negative countdown', () => {
    expect(formatDuration('en', -5000)).toBe('0s');
  });

  it('reports plural categories, which differ between the two locales', () => {
    // English distinguishes one/other; Turkish does not. A translated template cannot
    // assume the English shape.
    expect(pluralCategory('en', 1)).toBe('one');
    expect(pluralCategory('en', 5)).toBe('other');
    expect(pluralCategory('tr-TR', 5)).toBe('other');
  });
});
