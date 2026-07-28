'use client';

import { LOCALE_STORAGE_KEY } from '@collection-war/localization';
import { isSupportedLocale, type SupportedLocale } from '@collection-war/shared-types';

/**
 * Locale persistence for the web application.
 *
 * A cookie rather than `localStorage`, because the server needs to read it: rendering the
 * first paint in the wrong language and correcting it after hydration is a visible flash
 * and a worse experience than getting it right server-side.
 *
 * The stored value is re-validated on read. It is client-controlled data, so an
 * unrecognised value must fall back rather than be trusted into a lookup.
 */

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function readStoredLocale(): SupportedLocale | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.split('; ').find((entry) => entry.startsWith(`${LOCALE_STORAGE_KEY}=`));
  const value = match?.split('=')[1];

  return isSupportedLocale(value) ? value : null;
}

export function writeStoredLocale(locale: SupportedLocale): void {
  if (typeof document === 'undefined') return;

  // `SameSite=Lax` is enough: this is a display preference, not a credential, and Lax
  // keeps it working for normal top-level navigation.
  document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
