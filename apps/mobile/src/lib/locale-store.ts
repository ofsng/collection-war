import * as SecureStore from 'expo-secure-store';
import { LOCALE_STORAGE_KEY } from '@collection-war/localization';
import { isSupportedLocale, type SupportedLocale } from '@collection-war/shared-types';

/**
 * Locale persistence on the device.
 *
 * SecureStore rather than AsyncStorage. A language preference is not itself sensitive, but
 * this module establishes the pattern for the storage that WILL be sensitive — session and
 * refresh tokens. Getting an app to use the keychain/keystore is much easier before there
 * are three call sites using plain storage.
 *
 * SecureStore is unavailable on web, and every call is wrapped: a storage failure must
 * degrade to "no stored preference", never crash the app on launch.
 */

export async function readStoredLocale(): Promise<SupportedLocale | null> {
  try {
    const value = await SecureStore.getItemAsync(sanitizeKey(LOCALE_STORAGE_KEY));

    // Re-validated on read. Stored data is not trusted input — it may have been written by
    // an older build with a different set of locales.
    return isSupportedLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export async function writeStoredLocale(locale: SupportedLocale): Promise<void> {
  try {
    await SecureStore.setItemAsync(sanitizeKey(LOCALE_STORAGE_KEY), locale);
  } catch {
    // A failed write means the preference is not remembered next launch. That is a minor
    // annoyance; crashing the app over it would not be.
  }
}

/**
 * SecureStore keys are restricted to alphanumerics, `.`, `-` and `_`. The shared key
 * contains a `.` already, but this guards against a future rename introducing a character
 * that fails only on a device.
 */
function sanitizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}
