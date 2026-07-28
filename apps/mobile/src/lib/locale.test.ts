import { beforeEach, describe, expect, it } from 'vitest';
import { __setLocales, __throwOnRead } from '../test-stubs/expo-localization';
import { __failNext, __reset } from '../test-stubs/expo-secure-store';
import { readDeviceLocales, resolveInitialLocale } from './device-locale';
import { readStoredLocale, writeStoredLocale } from './locale-store';
import { mobileConfig, theme } from './config';

beforeEach(() => {
  __reset();
  __setLocales(['tr-TR']);
});

describe('device locale', () => {
  it('reads the device language list', () => {
    __setLocales(['en-GB', 'tr-TR']);

    expect(readDeviceLocales()).toEqual(['en-GB', 'tr-TR']);
  });

  it('returns an empty list instead of crashing when the native module is unavailable', () => {
    // A launch-time crash over a display preference would be a far worse outcome than
    // falling back to the default language.
    __throwOnRead();

    expect(readDeviceLocales()).toEqual([]);
  });
});

describe('resolveInitialLocale', () => {
  it('prefers an explicit stored choice over the device language', () => {
    __setLocales(['tr-TR']);

    expect(resolveInitialLocale('en')).toBe('en');
  });

  it('uses the device language when nothing is stored', () => {
    __setLocales(['en-US']);

    expect(resolveInitialLocale(null)).toBe('en');
  });

  it('maps a regional variant to the closest supported locale', () => {
    __setLocales(['tr-CY']);

    expect(resolveInitialLocale(null)).toBe('tr-TR');
  });

  it('falls back to Turkish for an unsupported device language', () => {
    __setLocales(['de-DE', 'fr-FR']);

    expect(resolveInitialLocale(null)).toBe('tr-TR');
  });
});

describe('locale storage', () => {
  it('round-trips a stored preference', async () => {
    await writeStoredLocale('en');

    expect(await readStoredLocale()).toBe('en');
  });

  it('returns null when nothing has been stored', async () => {
    expect(await readStoredLocale()).toBeNull();
  });

  it('returns null rather than throwing when storage is unavailable', async () => {
    __failNext();

    expect(await readStoredLocale()).toBeNull();
  });

  it('swallows a write failure rather than crashing the app', async () => {
    __failNext();

    await expect(writeStoredLocale('en')).resolves.toBeUndefined();
  });
});

describe('mobile configuration', () => {
  it('defaults to a local API endpoint', () => {
    expect(mobileConfig.apiUrl).toMatch(/^https?:\/\//);
  });

  it('defaults to Turkish', () => {
    expect(mobileConfig.defaultLocale).toBe('tr-TR');
  });

  it('mirrors the design-system palette', () => {
    // The duplication is documented and deliberate; this test at least makes a silent
    // divergence visible if someone edits one side. Unifying the token layer is tracked in
    // docs/status/DEFERRED_WORK.md.
    expect(theme.accent).toBe('#4c8dff');
    expect(theme.success).toBe('#3fb950');
    expect(theme.danger).toBe('#f85149');
  });
});
