'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, DefinitionRow, Stack, StatusBadge, Text } from '@collection-war/design-system';
import { createApiClient, createSystemApi } from '@collection-war/api-client';
import { publicConfig } from '../lib/config';
import { useAdminContext } from './providers';

/**
 * API health panel for the admin console.
 *
 * Read-only. It performs no administrative action, so it is safe to render on a page that
 * nobody is authenticated for.
 */
const systemApi = createSystemApi(
  createApiClient({
    baseUrl: publicConfig.apiUrl,
    getAccessToken: () => null,
    timeoutMs: 10_000,
  }),
);

export function AdminSystemStatus() {
  const { t } = useAdminContext();

  const readiness = useQuery({
    queryKey: ['admin', 'system', 'readiness'],
    queryFn: ({ signal }) => systemApi.readiness(signal),
    retry: false,
    refetchInterval: 15_000,
  });

  if (readiness.isPending) {
    return (
      <Card>
        <Text tone="secondary">{t('system.api.checking')}</Text>
      </Card>
    );
  }

  const payload = readiness.data?.ok ? readiness.data.value : null;
  const unreachable = readiness.isError || !payload;

  return (
    <Card>
      <Stack gap="md">
        <Stack direction="row" justify="between" align="center" wrap>
          <Text size="lg">{t('system.title')}</Text>
          <StatusBadge
            tone={unreachable ? 'unknown' : payload.status === 'ready' ? 'up' : 'down'}
            label={
              unreachable
                ? t('system.api.unreachable')
                : payload.status === 'ready'
                  ? t('system.api.healthy')
                  : t('system.api.unhealthy')
            }
          />
        </Stack>

        <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <DefinitionRow term={t('system.api.endpoint')}>
            <code>{publicConfig.apiUrl}</code>
          </DefinitionRow>

          {payload ? (
            <>
              <DefinitionRow term={t('system.dependency.database')}>
                <StatusBadge
                  tone={payload.dependencies.database.status}
                  label={t(`system.dependency.${payload.dependencies.database.status}`)}
                />
              </DefinitionRow>
              <DefinitionRow term={t('system.dependency.redis')}>
                <StatusBadge
                  tone={payload.dependencies.redis.status}
                  label={t(`system.dependency.${payload.dependencies.redis.status}`)}
                />
              </DefinitionRow>
            </>
          ) : null}
        </dl>
      </Stack>
    </Card>
  );
}
