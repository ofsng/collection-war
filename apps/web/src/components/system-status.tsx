'use client';

import { useQuery } from '@tanstack/react-query';
import { Button, Card, DefinitionRow, Stack, StatusBadge, Text } from '@collection-war/design-system';
import { formatDuration } from '@collection-war/localization';
import { publicConfig } from '../lib/config';
import { systemApi } from '../lib/api';
import { useLocale } from './locale-provider';

/**
 * The health screen.
 *
 * This is the whole point of the web shell: it proves that a browser can reach the API
 * through the shared client, that the shared localization and design packages resolve, and
 * that failures are handled rather than thrown.
 *
 * It is NOT a game screen and must not grow into one.
 */
export function SystemStatus() {
  const { t, locale } = useLocale();

  const readiness = useQuery({
    queryKey: ['system', 'readiness'],
    queryFn: async ({ signal }) => {
      const startedAt = performance.now();
      const result = await systemApi.readiness(signal);
      return { result, latencyMs: Math.round(performance.now() - startedAt) };
    },
    // The API being down is an expected state on a developer machine with no
    // infrastructure running. Retrying four times just delays showing that.
    retry: false,
    refetchInterval: 15_000,
  });

  const info = useQuery({
    queryKey: ['system', 'info'],
    queryFn: async ({ signal }) => systemApi.info(signal),
    retry: false,
  });

  if (readiness.isPending) {
    return (
      <Card>
        <Text tone="secondary">{t('system.api.checking')}</Text>
      </Card>
    );
  }

  // Two distinct failures the player experiences differently, so they read differently:
  // the network never answered, versus the API answered and said it is unwell.
  const unreachable = readiness.isError || (readiness.data && !readiness.data.result.ok);
  const payload = readiness.data?.result.ok ? readiness.data.result.value : null;
  const healthy = payload?.status === 'ready';

  return (
    <Card>
      <Stack gap="md">
        <Stack direction="row" justify="between" align="center" wrap>
          <Text size="lg">{t('system.title')}</Text>
          <StatusBadge
            tone={unreachable ? 'unknown' : healthy ? 'up' : 'down'}
            label={
              unreachable
                ? t('system.api.unreachable')
                : healthy
                  ? t('system.api.healthy')
                  : t('system.api.unhealthy')
            }
          />
        </Stack>

        <Text tone="secondary" size="sm">
          {t('system.description')}
        </Text>

        <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <DefinitionRow term={t('system.api.endpoint')}>
            <code>{publicConfig.apiUrl}</code>
          </DefinitionRow>

          {readiness.data ? (
            <DefinitionRow term={t('system.api.latency')}>
              {formatDuration(locale, readiness.data.latencyMs)}
            </DefinitionRow>
          ) : null}

          {info.data?.ok ? (
            <>
              <DefinitionRow term={t('system.api.version')}>{info.data.value.apiVersion}</DefinitionRow>
              <DefinitionRow term={t('system.api.environment')}>{info.data.value.environment}</DefinitionRow>
            </>
          ) : null}

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

        <Stack direction="row" gap="sm">
          <Button onClick={() => void readiness.refetch()} disabled={readiness.isFetching}>
            {readiness.isFetching ? t('common.loading') : t('system.api.retry')}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
