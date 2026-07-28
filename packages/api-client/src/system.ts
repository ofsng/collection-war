import type { Result } from '@collection-war/shared-types';
import type { ApiClient } from './client';
import {
  healthResponseSchema,
  readinessResponseSchema,
  systemInfoResponseSchema,
  type HealthResponse,
  type ReadinessResponse,
  type SystemInfoResponse,
} from './types';

/**
 * System endpoints — the only endpoints that exist at bootstrap.
 *
 * They exist to prove the architecture works end to end: a client application can reach
 * the API, the API can reach its dependencies, and the shared contract types line up. No
 * game endpoint will be added here until its domain specification is approved.
 */

export function createSystemApi(client: ApiClient) {
  return {
    /** Liveness. Never touches a dependency, so a database outage does not restart the process. */
    health(signal?: AbortSignal): Promise<Result<HealthResponse>> {
      return client.request({ path: '/health', schema: healthResponseSchema, signal });
    },

    /**
     * Readiness. Reports dependency status; a load balancer uses this to route traffic.
     *
     * A 503 here is a real answer, not a failure: the API is telling us which dependency
     * is down. The caller wants that detail, so the body is parsed rather than discarded.
     */
    readiness(signal?: AbortSignal): Promise<Result<ReadinessResponse>> {
      return client.request({
        path: '/ready',
        schema: readinessResponseSchema,
        signal,
        treatStatusAsSuccess: [503],
      });
    },

    info(signal?: AbortSignal): Promise<Result<SystemInfoResponse>> {
      return client.request({ path: '/api/v1/system/info', schema: systemInfoResponseSchema, signal });
    },
  };
}

export type SystemApi = ReturnType<typeof createSystemApi>;
