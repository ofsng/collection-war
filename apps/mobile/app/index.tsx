import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@collection-war/shared-types';
import { systemApi } from '../src/lib/api';
import { mobileConfig, theme } from '../src/lib/config';
import { useLocale } from '../src/components/locale-provider';

/**
 * The only screen in the mobile shell.
 *
 * Same purpose as the web shell's home page: prove the device can reach the API, prove the
 * shared packages resolve inside React Native, and prove the failure states render. No
 * game screen belongs here.
 */
export default function HealthScreen() {
  const { t, locale, setLocale } = useLocale();
  const insets = useSafeAreaInsets();

  const readiness = useQuery({
    queryKey: ['system', 'readiness'],
    queryFn: ({ signal }) => systemApi.readiness(signal),
    retry: false,
  });

  const payload = readiness.data?.ok ? readiness.data.value : null;
  const unreachable = readiness.isError || (readiness.data !== undefined && !readiness.data.ok);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        // Respects the notch, the home indicator and the Android gesture bar. Hard-coded
        // padding would put controls under them on some devices and not others.
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text style={styles.title}>{t('app.name')}</Text>
      <Text style={styles.subtitle}>{t('app.tagline')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('system.title')}</Text>
        <Text style={styles.body}>{t('system.description')}</Text>

        {readiness.isPending ? (
          <View style={styles.row}>
            <ActivityIndicator color={theme.accent} />
            <Text style={styles.body}>{t('system.api.checking')}</Text>
          </View>
        ) : (
          <View style={styles.stack}>
            <StatusRow label={t('system.api.endpoint')} value={mobileConfig.apiUrl} tone="neutral" />
            <StatusRow
              label={t('system.title')}
              value={
                unreachable
                  ? t('system.api.unreachable')
                  : payload?.status === 'ready'
                    ? t('system.api.healthy')
                    : t('system.api.unhealthy')
              }
              tone={unreachable ? 'neutral' : payload?.status === 'ready' ? 'up' : 'down'}
            />
            {payload ? (
              <>
                <StatusRow
                  label={t('system.dependency.database')}
                  value={t(`system.dependency.${payload.dependencies.database.status}`)}
                  tone={payload.dependencies.database.status}
                />
                <StatusRow
                  label={t('system.dependency.redis')}
                  value={t(`system.dependency.${payload.dependencies.redis.status}`)}
                  tone={payload.dependencies.redis.status}
                />
              </>
            ) : null}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => void readiness.refetch()}
          disabled={readiness.isFetching}
          style={({ pressed }) => [styles.button, (pressed || readiness.isFetching) && styles.buttonPressed]}
        >
          <Text style={styles.buttonLabel}>
            {readiness.isFetching ? t('common.loading') : t('system.api.retry')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('language.label')}</Text>
        <View style={styles.row}>
          {SUPPORTED_LOCALES.map((supported: SupportedLocale) => (
            <Pressable
              key={supported}
              accessibilityRole="radio"
              accessibilityState={{ selected: locale === supported }}
              onPress={() => setLocale(supported)}
              style={[styles.localeChip, locale === supported && styles.localeChipActive]}
            >
              <Text style={styles.buttonLabel}>{t(`language.${supported}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.footnote}>{t('notice.no-gameplay')}</Text>
    </ScrollView>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone: 'up' | 'down' | 'neutral' | 'unknown';
}) {
  const toneColor = tone === 'up' ? theme.success : tone === 'down' ? theme.danger : theme.textSecondary;

  return (
    <View style={styles.statusRow}>
      <Text style={styles.label}>{label}</Text>
      {/* A coloured dot alone would be invisible to a screen reader and ambiguous to a
          colour-blind player, so the text always carries the meaning. */}
      <Text style={[styles.value, { color: toneColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { paddingHorizontal: 16, gap: 16 },
  title: { color: theme.textPrimary, fontSize: 28, fontWeight: '700' },
  subtitle: { color: theme.textSecondary, fontSize: 14, marginTop: -8 },
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '600' },
  body: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
  stack: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  label: { color: theme.textSecondary, fontSize: 13 },
  value: { fontSize: 13, flexShrink: 1 },
  button: {
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    // 44pt is Apple's minimum touch target and roughly Android's 48dp. Smaller targets
    // are measurably harder to hit and fail accessibility review.
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.6 },
  buttonLabel: { color: theme.background, fontSize: 15, fontWeight: '600' },
  localeChip: {
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: theme.textSecondary,
  },
  localeChipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  footnote: { color: theme.textSecondary, fontSize: 12, textAlign: 'center' },
});
