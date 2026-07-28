import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from '@collection-war/shared-types';

/**
 * Client-side configuration.
 *
 * `NEXT_PUBLIC_*` values are INLINED INTO THE BUNDLE at build time and are visible to
 * anyone who opens developer tools. Only non-secret values may live behind that prefix,
 * and this module is the only place that reads them — so the full set of what ships to a
 * browser is auditable in one file.
 *
 * Anything secret stays server-side and is never read here.
 */

function readPublicApiUrl(): string {
  // Must be a static property access, not `process.env[key]`. Next replaces the literal
  // expression at build time; a dynamic lookup yields undefined in the browser.
  const value = process.env.NEXT_PUBLIC_API_URL;

  if (!value) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env at the repository root before building.',
    );
  }

  return value;
}

export const publicConfig = {
  apiUrl: readPublicApiUrl(),
  defaultLocale: isSupportedLocale(process.env.NEXT_PUBLIC_DEFAULT_LOCALE)
    ? (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as SupportedLocale)
    : DEFAULT_LOCALE,
} as const;
