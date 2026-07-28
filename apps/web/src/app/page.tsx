'use client';

import { useSyncExternalStore } from 'react';
import { Stack, Text } from '@collection-war/design-system';
import { LanguageSwitcher } from '../components/language-switcher';
import { SystemStatus } from '../components/system-status';
import { AuthPanel } from '../components/auth-panel';
import { GamePanel } from '../components/game-panel';
import { useLocale } from '../components/locale-provider';
import { getSession, subscribeToSession } from '../lib/session';

/**
 * Collection War — the playable loop in the browser.
 *
 * Sign in, choose a starter, build a team, fight, collect rewards, level up.
 *
 * The client decides nothing. Every outcome shown here was computed by the server; the battle
 * log is animated, not produced.
 */
export default function HomePage() {
  const { t } = useLocale();

  // `useSyncExternalStore` rather than state + effect: the session lives outside React, and
  // this is the sanctioned way to read external state without tearing during concurrent
  // rendering. `getServerSnapshot` returns null so the server renders the signed-out view.
  const session = useSyncExternalStore(
    subscribeToSession,
    () => getSession(),
    () => null,
  );

  return (
    <main id="main" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px' }}>
      <Stack gap="xl">
        <Stack direction="row" justify="between" align="center" wrap gap="md">
          <Stack gap="xs">
            <Text size="xl">{t('app.name')}</Text>
            <Text tone="secondary" size="sm">
              {session ? session.displayName : t('app.tagline')}
            </Text>
          </Stack>
          <LanguageSwitcher />
        </Stack>

        {session ? <GamePanel /> : <AuthPanel />}

        <SystemStatus />
      </Stack>
    </main>
  );
}
