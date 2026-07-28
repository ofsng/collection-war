'use client';

import { createApiClient, createGameApi, type Session } from '@collection-war/api-client';
import { publicConfig } from './config';
import { readStoredLocale } from './locale';

/**
 * Session and API access for the web client.
 *
 * The access token lives in memory only. Putting it in `localStorage` would make one XSS into
 * permanent account access — the refresh token belongs in an `httpOnly` cookie, which is a
 * server-set concern and is recorded as deferred work.
 *
 * FOR THE SLICE the refresh token is held in memory too, so a page reload signs the player
 * out. That is a deliberate, stated limitation rather than an oversight: the alternative
 * (storing it where JavaScript can read it) is the exact thing the security model forbids.
 */

let session: Session | null = null;
const listeners = new Set<() => void>();

export function getSession(): Session | null {
  return session;
}

export function setSession(next: Session | null): void {
  session = next;
  for (const listener of listeners) listener();
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The API client.
 *
 * The token is resolved PER REQUEST by callback rather than captured at construction, so a
 * refreshed token takes effect on the very next call rather than after a reload.
 */
const apiClient = createApiClient({
  baseUrl: publicConfig.apiUrl,
  getAccessToken: () => session?.accessToken ?? null,
  getLocale: () => readStoredLocale() ?? publicConfig.defaultLocale,
  getCorrelationId: () => crypto.randomUUID(),
  timeoutMs: 10_000,
});

export const gameApi = createGameApi(apiClient);

/**
 * A fresh idempotency key.
 *
 * Call this ONCE PER INTENT and reuse the value on retry. Generating a new key on retry
 * defeats idempotency entirely, which is the most common way it is implemented wrongly.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
