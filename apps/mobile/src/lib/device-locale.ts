import * as Localization from 'expo-localization';
import { resolveLocale } from '@collection-war/localization';
import type { SupportedLocale } from '@collection-war/shared-types';

/**
 * Determines which language to show, using the same precedence rules as the web
 * application: an explicit stored choice first, the device's language second, the default
 * last.
 *
 * The device locale list is read through `expo-localization` rather than a global, so this
 * module is the only place that touches a native API — which is what makes the resolution
 * logic itself testable without a device.
 */
export function readDeviceLocales(): readonly string[] {
  try {
    return Localization.getLocales().map((locale) => locale.languageTag);
  } catch {
    // On an unusual platform or during an early cold start this can be unavailable.
    // Falling back is correct; crashing at launch over a display preference is not.
    return [];
  }
}

export function resolveInitialLocale(storedPreference: SupportedLocale | null): SupportedLocale {
  return resolveLocale(storedPreference, null, readDeviceLocales());
}
