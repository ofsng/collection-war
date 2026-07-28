'use client';

import { useState } from 'react';
import { Button, Card, Stack, Text } from '@collection-war/design-system';
import { useLocale } from './locale-provider';
import { gameApi, setSession } from '../lib/session';

/**
 * Registration and sign-in.
 *
 * Both flows share one form because their failure modes must look identical from the
 * outside — a distinct "that email is taken" would turn registration into an oracle for
 * which addresses have accounts.
 */
export function AuthPanel() {
  const { t, locale } = useLocale();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result =
      mode === 'register'
        ? await gameApi.register({ email, password, displayName, locale })
        : await gameApi.login({ email, password });

    setBusy(false);

    if (!result.ok) {
      // The server's message is developer-facing English; the client renders its own copy
      // from the error code so the player sees their own language.
      setError(t(mode === 'register' ? 'auth.error.register' : 'auth.error.login'));
      return;
    }

    setSession(result.value);
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <Stack gap="md">
          <Text size="lg">{t(mode === 'register' ? 'auth.register.title' : 'auth.login.title')}</Text>

          {mode === 'register' ? (
            <Field
              id="displayName"
              label={t('auth.field.displayName')}
              value={displayName}
              onChange={setDisplayName}
              autoComplete="nickname"
            />
          ) : null}

          <Field
            id="email"
            label={t('auth.field.email')}
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
          />

          <Field
            id="password"
            label={t('auth.field.password')}
            value={password}
            onChange={setPassword}
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            hint={mode === 'register' ? t('auth.field.password.hint') : undefined}
          />

          {/* role="alert" so a screen reader announces the failure rather than leaving the
              player wondering why nothing happened. */}
          {error ? (
            <Text role="alert" size="sm" style={{ color: '#f85149' }}>
              {error}
            </Text>
          ) : null}

          <Button type="submit" disabled={busy}>
            {busy
              ? t('common.loading')
              : t(mode === 'register' ? 'auth.register.submit' : 'auth.login.submit')}
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              setMode(mode === 'register' ? 'login' : 'register');
              setError(null);
            }}
          >
            {t(mode === 'register' ? 'auth.switch.toLogin' : 'auth.switch.toRegister')}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* A real label bound by htmlFor — a styled div would be invisible to a screen reader. */}
      <label htmlFor={id} style={{ fontSize: 14, color: '#9aa5b1' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.value)}
        style={{
          background: '#1f242c',
          color: '#e8ecf1',
          border: '1px solid #2b323c',
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 15,
          // 44px minimum touch target, on web as well as mobile.
          minHeight: 44,
        }}
      />
      {hint ? (
        <span id={hintId} style={{ fontSize: 12, color: '#6e7781' }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
