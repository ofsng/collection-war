'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { SupportedLocale } from '@collection-war/shared-types';
import { LocaleProvider } from './locale-provider';

/**
 * Client-side providers.
 *
 * The `QueryClient` is created inside `useState` rather than as a module constant. A
 * module-level client is shared across every request on the server, which in a
 * server-rendered application means one user's cached data can be served to another —
 * a real data-leak class, not a theoretical one.
 */
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
            // Long enough to avoid a refetch storm on navigation, short enough that
            // server-authoritative state (balances, ownership) is never stale for long.
            staleTime: 30_000,
            // The server is the authority; a stale client cache must not persist across
            // a reconnect.
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
    </QueryClientProvider>
  );
}
