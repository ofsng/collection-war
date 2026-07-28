import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createTranslator, type Translator } from '@collection-war/localization';
import type { SupportedLocale } from '@collection-war/shared-types';
import { readStoredLocale, writeStoredLocale } from '../lib/locale-store';
import { resolveInitialLocale } from '../lib/device-locale';
import { mobileConfig } from '../lib/config';

/**
 * Locale context for the mobile application.
 *
 * The initial value is the device-derived locale, applied synchronously so the first frame
 * is already in the right language. The stored preference is read asynchronously (SecureStore
 * is async) and applied when it arrives.
 *
 * The order matters: showing device-language text for one frame and correcting it is far
 * better than showing a blank screen while waiting on storage.
 */

interface MobileLocaleContext {
  readonly locale: SupportedLocale;
  readonly t: Translator['t'];
  setLocale(locale: SupportedLocale): void;
}

const LocaleContext = createContext<MobileLocaleContext | null>(null);

export function LocaleProvider({ children }: { readonly children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => resolveInitialLocale(null));

  useEffect(() => {
    let cancelled = false;

    void readStoredLocale().then((stored) => {
      // An explicit past choice always beats the device language.
      if (!cancelled && stored) setLocaleState(stored);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    // Fire-and-forget: the UI must switch immediately, not after a keychain round trip.
    void writeStoredLocale(next);
  }, []);

  const value = useMemo<MobileLocaleContext>(() => {
    const translator = createTranslator(locale);
    return { locale, t: translator.t, setLocale };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): MobileLocaleContext {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used inside a <LocaleProvider>');
  }

  return context;
}

export const defaultLocale = mobileConfig.defaultLocale;
