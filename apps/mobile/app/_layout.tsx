import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { LocaleProvider } from '../src/components/locale-provider';
import { theme } from '../src/lib/config';

/**
 * Root layout for the Expo application.
 *
 * `SafeAreaProvider` is not cosmetic: without it, content renders under the notch on an
 * iPhone and under the gesture bar on Android, and the affected controls become
 * untappable. It wraps everything so no screen can forget it.
 *
 * As on web, the `QueryClient` is created inside `useState` rather than at module scope so
 * that a fast refresh during development does not leave a stale cache attached to a new
 * component tree.
 */
export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.textPrimary,
              contentStyle: { backgroundColor: theme.background },
            }}
          />
        </LocaleProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
