'use client';

import { Stack, Text } from '@collection-war/design-system';
import { LanguageSwitcher } from '../components/language-switcher';
import { SystemStatus } from '../components/system-status';
import { useLocale } from '../components/locale-provider';

/**
 * The only page in the web shell.
 *
 * It exists to answer one question — "can this browser reach the Collection War API?" —
 * and to demonstrate the shared localization and design packages working. No game screen
 * belongs here until its feature specification is approved.
 */
export default function HomePage() {
  const { t } = useLocale();

  return (
    <main
      id="main"
      style={{
        maxWidth: 720,
        // `margin: auto` plus a max width is the whole responsive story for a single
        // column. It works from a 320px phone to a wide desktop without a media query.
        margin: '0 auto',
        padding: '32px 16px',
      }}
    >
      <Stack gap="xl">
        <Stack direction="row" justify="between" align="center" wrap gap="md">
          <Stack gap="xs">
            <Text size="xl">{t('app.name')}</Text>
            <Text tone="secondary" size="sm">
              {t('app.tagline')}
            </Text>
          </Stack>
          <LanguageSwitcher />
        </Stack>

        <SystemStatus />

        <Text tone="secondary" size="xs">
          {t('notice.no-gameplay')}
        </Text>
      </Stack>
    </main>
  );
}
