import { createApiClient, createSystemApi } from '@collection-war/api-client';
import { publicConfig } from './config';
import { readStoredLocale } from './locale';

/**
 * The web application's API client.
 *
 * Constructed once and shared. Note what it does NOT do: it holds no token in a module
 * variable and reads the locale per request via a callback, so switching language or
 * signing in takes effect on the very next call rather than after a reload.
 *
 * Authentication is not implemented yet, so `getAccessToken` returns null. It is wired now
 * rather than later so that the first authenticated feature does not have to retrofit
 * token handling into three applications.
 */
export const apiClient = createApiClient({
  baseUrl: publicConfig.apiUrl,
  getLocale: () => readStoredLocale() ?? publicConfig.defaultLocale,
  getCorrelationId: () => crypto.randomUUID(),
  getAccessToken: () => null,
  timeoutMs: 10_000,
});

export const systemApi = createSystemApi(apiClient);
