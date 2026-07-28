'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { createTranslator, type Translator } from '@collection-war/localization';
import type { SupportedLocale } from '@collection-war/shared-types';

/**
 * Admin providers.
 *
 * Simpler than the web application's: an administrator's language is a session preference
 * rather than something inferred from a device, so there is no cookie negotiation here.
 *
 * As in the web application, the `QueryClient` is created per component instance rather
 * than at module scope, so one administrator's cached data can never be served to another
 * during server rendering.
 */

interface AdminContextValue {
  readonly locale: SupportedLocale;
  readonly t: Translator['t'];
  setLocale(locale: SupportedLocale): void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function Providers({
  initialLocale,
  children,
}: {
  readonly initialLocale: SupportedLocale;
  readonly children: ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Shorter than the player app's. An administrator looking at a player's state
            // during a support call needs current data, not a 30-second-old view.
            staleTime: 5_000,
            retry: 1,
          },
        },
      }),
  );

  const [locale, setLocale] = useState<SupportedLocale>(initialLocale);

  const value = useMemo<AdminContextValue>(() => {
    const translator = createTranslator(locale);
    return { locale, t: translator.t, setLocale };
  }, [locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
    </QueryClientProvider>
  );
}

export function useAdminContext(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdminContext must be used inside <Providers>');
  return context;
}
