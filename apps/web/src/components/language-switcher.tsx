'use client';

import { SUPPORTED_LOCALES, type SupportedLocale } from '@collection-war/shared-types';
import { Stack } from '@collection-war/design-system';
import { useLocale } from './locale-provider';

/**
 * Language selection.
 *
 * A real `<select>` with a real `<label>`, not a styled div. It works with a keyboard, a
 * screen reader and a mobile browser's native picker without any code from us.
 *
 * Each option is written in ITS OWN language — "Türkçe", not "Turkish". Someone who cannot
 * read the current interface language needs to recognise their own.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <Stack direction="row" gap="sm" align="center">
      <label htmlFor="locale-select" style={{ fontSize: 14 }}>
        {t('language.label')}
      </label>
      <select
        id="locale-select"
        value={locale}
        onChange={(event) => setLocale(event.target.value as SupportedLocale)}
        style={{
          background: '#1f242c',
          color: '#e8ecf1',
          border: '1px solid #2b323c',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 14,
        }}
      >
        {SUPPORTED_LOCALES.map((supported) => (
          <option key={supported} value={supported}>
            {t(`language.${supported}`)}
          </option>
        ))}
      </select>
    </Stack>
  );
}
