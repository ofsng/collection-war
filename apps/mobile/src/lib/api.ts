import { createApiClient, createSystemApi } from '@collection-war/api-client';
import { mobileConfig } from './config';

/**
 * The mobile application's API client.
 *
 * A shorter timeout than the web client's: a phone on a poor mobile connection needs to
 * reach a retry state quickly, because a spinner that never resolves is indistinguishable
 * from a frozen app.
 *
 * `getAccessToken` returns null until authentication exists. When it lands it will read
 * from SecureStore — see `./locale-store` for the pattern.
 */
const apiClient = createApiClient({
  baseUrl: mobileConfig.apiUrl,
  getAccessToken: () => null,
  timeoutMs: 8_000,
});

export const systemApi = createSystemApi(apiClient);
