import { Card, Stack, Text } from '@collection-war/design-system';
import { createTranslator } from '@collection-war/localization';
import { requireAdmin } from '../lib/auth';
import { publicConfig } from '../lib/config';
import { AdminSystemStatus } from '../components/admin-system-status';

/**
 * The admin landing page.
 *
 * This is a SERVER component, and the authorization check happens here, on the server,
 * before any protected content is rendered. Checking on the client would mean the content
 * was already sent — hiding it with CSS is not access control.
 *
 * `requireAdmin` currently denies everything because authentication does not exist yet, so
 * this page renders only the explanatory notice and a health panel. That is the whole
 * point: the guard is real and it is failing closed.
 */
export default async function AdminHomePage() {
  const access = await requireAdmin('SUPPORT');
  const t = createTranslator(publicConfig.defaultLocale).t;

  return (
    <main id="main" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px' }}>
      <Stack gap="xl">
        <Stack gap="xs">
          <Text size="xl">{t('admin.title')}</Text>
          <Text tone="secondary" size="sm">
            {t('app.tagline')}
          </Text>
        </Stack>

        {access.allowed ? (
          // Unreachable today. Kept so the protected branch exists and is reviewable
          // rather than being invented later under time pressure.
          <Card>
            <Text>Administrative tools will appear here once they are specified.</Text>
          </Card>
        ) : (
          <Card>
            <Stack gap="sm">
              <Text>{t('admin.protected.notice')}</Text>
              <Text tone="secondary" size="xs">
                Access denied: {access.reason}
              </Text>
            </Stack>
          </Card>
        )}

        <AdminSystemStatus />

        <Text tone="secondary" size="xs">
          {t('notice.no-gameplay')}
        </Text>
      </Stack>
    </main>
  );
}
