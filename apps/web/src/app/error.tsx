'use client';

import { useEffect } from 'react';
import { Button, Card, Stack, Text } from '@collection-war/design-system';

/**
 * Route-level error boundary.
 *
 * Next.js renders this instead of a blank page when a client component throws. It shows a
 * recovery action rather than a dead end.
 *
 * It shows NO error message and NO stack. A rendering error can carry an API response, a
 * user's own data, or internal identifiers, and the person looking at the screen may be in
 * a public place or sharing it. The detail goes to the console (and, later, to error
 * reporting) instead.
 *
 * The strings here are literals rather than translation keys on purpose: this component
 * must render even when the failure was the locale provider itself.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled rendering error', error);
  }, [error]);

  return (
    <main id="main" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      <Card>
        <Stack gap="md">
          <Text size="lg">Something went wrong</Text>
          <Text tone="secondary" size="sm">
            The screen failed to render. This has been logged.
          </Text>
          {/* The digest is a server-side correlation handle, not error content. Safe, and
              it is what support will ask for. */}
          {error.digest ? (
            <Text tone="secondary" size="xs">
              Reference: {error.digest}
            </Text>
          ) : null}
          <div>
            <Button onClick={reset}>Reload</Button>
          </div>
        </Stack>
      </Card>
    </main>
  );
}
