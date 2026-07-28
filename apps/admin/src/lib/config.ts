import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from '@collection-war/shared-types';

/**
 * Client-side configuration for the admin application.
 *
 * As in the web application, `NEXT_PUBLIC_*` values are inlined into the bundle and are
 * therefore public. This file is the only place they are read, so the full set that ships
 * to a browser is auditable at a glance.
 */
export const publicConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  defaultLocale: isSupportedLocale(process.env.NEXT_PUBLIC_DEFAULT_LOCALE)
    ? (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as SupportedLocale)
    : DEFAULT_LOCALE,
} as const;
