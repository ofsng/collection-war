'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createTranslator, resolveLocale, type Translator } from '@collection-war/localization';
import type { SupportedLocale } from '@collection-war/shared-types';
import { readStoredLocale, writeStoredLocale } from '../lib/locale';

/**
 * Locale context.
 *
 * Every user-facing string in this application comes from `t(key)`. There is no literal
 * UI text in any component — that is the rule the localization architecture depends on,
 * and it is much easier to keep than to retrofit.
 */

interface LocaleContextValue {
  readonly locale: SupportedLocale;
  readonly t: Translator['t'];
  setLocale(locale: SupportedLocale): void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  readonly initialLocale: SupportedLocale;
  readonly children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(
    // The server passes what it read from the cookie; the client re-resolves against its
    // own signals in case the two disagree (a cookie written in another tab, say).
    () => readStoredLocale() ?? initialLocale,
  );

  const setLocale = useCallback((next: SupportedLocale) => {
    writeStoredLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const translator = createTranslator(locale);
    return { locale, t: translator.t, setLocale };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);

  if (!context) {
    // A component rendering outside the provider would silently show raw translation keys.
    // Failing loudly during development is much cheaper than finding it in QA.
    throw new Error('useLocale must be used inside a <LocaleProvider>');
  }

  return context;
}

/** Re-exported so a server component can resolve the locale with the same rules. */
export { resolveLocale };
