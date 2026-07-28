import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from '@collection-war/shared-types';

/**
 * Mobile client configuration.
 *
 * `EXPO_PUBLIC_*` values are compiled into the JavaScript bundle that ships inside the
 * app. An installed app can be unpacked, so these are public in the strongest sense —
 * more so than a web bundle, because the binary persists on the device.
 *
 * NEVER put a secret behind `EXPO_PUBLIC_`. A mobile app cannot hold a secret at all; any
 * value it needs to authenticate with must be obtained from the server at runtime, tied to
 * a user session.
 *
 * The localhost default deserves a note: on an Android emulator `localhost` is the
 * emulator itself, not the development machine. `10.0.2.2` is the host. This is documented
 * in docs/runbooks/LOCAL_DEVELOPMENT.md because it costs everyone an hour exactly once.
 */
export const mobileConfig = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
  defaultLocale: isSupportedLocale(process.env.EXPO_PUBLIC_DEFAULT_LOCALE)
    ? (process.env.EXPO_PUBLIC_DEFAULT_LOCALE as SupportedLocale)
    : DEFAULT_LOCALE,
} as const;

/**
 * Mobile design tokens.
 *
 * These MIRROR `@collection-war/design-system`'s tokens rather than importing them.
 * React Native does not render DOM elements, so that package's React primitives are
 * unusable here, and its token module is not separately published yet.
 *
 * This duplication is a known, recorded compromise — not an oversight. Unifying the token
 * layer across DOM and native is tracked in docs/status/DEFERRED_WORK.md. Until then, a
 * change to a colour must be made in both places.
 */
export const theme = {
  background: '#0f1216',
  surface: '#171b21',
  border: '#2b323c',
  textPrimary: '#e8ecf1',
  textSecondary: '#9aa5b1',
  accent: '#4c8dff',
  success: '#3fb950',
  danger: '#f85149',
  neutral: '#6e7781',
} as const;
