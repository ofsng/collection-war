/**
 * Test stub for `expo-localization`.
 *
 * Mirrors only the surface `src/lib/device-locale.ts` uses. It is a stub, not a
 * simulation: it lets the resolution LOGIC be tested, and makes no claim about how the
 * real native module behaves on a device.
 */

let locales: Array<{ languageTag: string }> = [{ languageTag: 'tr-TR' }];

export function getLocales(): Array<{ languageTag: string }> {
  return locales;
}

/** Test-only control. */
export function __setLocales(next: string[]): void {
  locales = next.map((languageTag) => ({ languageTag }));
}

/** Test-only: makes the native call throw, to exercise the fallback path. */
export function __throwOnRead(): void {
  locales = new Proxy([] as Array<{ languageTag: string }>, {
    get() {
      throw new Error('Native module unavailable');
    },
  });
}
