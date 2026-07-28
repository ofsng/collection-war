import type { z } from 'zod';
import {
  APP_ERROR_CODES,
  err,
  ok,
  type AppErrorShape,
  type Result,
  type SupportedLocale,
} from '@collection-war/shared-types';

/**
 * The transport layer.
 *
 * Built on `fetch`, which exists natively in Node 20+, modern browsers and React Native.
 * No axios: one fewer dependency, one fewer supply-chain surface, and no bundle cost for
 * something the platform already provides.
 */

export interface ApiClientOptions {
  readonly baseUrl: string;
  /**
   * Called per request rather than passed once. A token expires mid-session; capturing it
   * at construction guarantees the client keeps sending a stale one.
   */
  readonly getAccessToken?: () => string | null | Promise<string | null>;
  readonly getLocale?: () => SupportedLocale;
  /** Threaded into logs so a client-visible failure can be found server-side. */
  readonly getCorrelationId?: () => string;
  readonly timeoutMs?: number;
  /** Injectable for tests. Defaults to the platform's `fetch`. */
  readonly fetchImpl?: typeof fetch;
}

export interface RequestOptions<TSchema extends z.ZodType> {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly body?: unknown;
  readonly schema: TSchema;
  readonly query?: Record<string, string | number | boolean | undefined>;
  /**
   * REQUIRED for any request that changes currency, inventory or ownership. The server
   * uses it to make a retry return the original result instead of repeating the work.
   * See docs/architecture/API_ARCHITECTURE.md#idempotency.
   */
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
  /**
   * Status codes whose BODY is still a meaningful, parseable response.
   *
   * Almost every endpoint should leave this empty — a non-2xx means "this failed". The
   * readiness probe is the deliberate exception: it answers 503 to tell a load balancer to
   * stop routing traffic, while the body carries exactly the dependency detail the caller
   * asked for. Treating that as a transport failure would throw away the answer.
   */
  readonly treatStatusAsSuccess?: readonly number[];
}

export interface ApiClient {
  request<TSchema extends z.ZodType>(options: RequestOptions<TSchema>): Promise<Result<z.output<TSchema>>>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export function createApiClient(options: ApiClientOptions): ApiClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async request(requestOptions) {
      // Resolved per request, not captured at construction. A client application creates
      // its API client at module scope, so capturing `globalThis.fetch` once would bind
      // whatever existed at import time — which breaks any test that installs a stub
      // afterwards, and any environment that polyfills fetch late.
      const fetchImpl = options.fetchImpl ?? globalThis.fetch;

      if (typeof fetchImpl !== 'function') {
        return err({
          category: 'INTERNAL',
          code: APP_ERROR_CODES.INTERNAL_ERROR,
          message: 'No fetch implementation is available. Pass `fetchImpl` explicitly.',
        });
      }

      const url = buildUrl(options.baseUrl, requestOptions.path, requestOptions.query);

      // Every request is bounded. A mobile client on a dead connection must fail and show
      // a retry, not spin forever behind a loading spinner.
      const timeoutController = new AbortController();
      const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
      const signal = requestOptions.signal
        ? anySignal([requestOptions.signal, timeoutController.signal])
        : timeoutController.signal;

      try {
        const token = await options.getAccessToken?.();

        const headers: Record<string, string> = {
          accept: 'application/json',
          'accept-language': options.getLocale?.() ?? 'tr-TR',
        };

        if (requestOptions.body !== undefined) headers['content-type'] = 'application/json';
        if (token) headers.authorization = `Bearer ${token}`;
        if (options.getCorrelationId) headers['x-correlation-id'] = options.getCorrelationId();
        if (requestOptions.idempotencyKey) headers['idempotency-key'] = requestOptions.idempotencyKey;

        const response = await fetchImpl(url, {
          method: requestOptions.method ?? 'GET',
          headers,
          body: requestOptions.body === undefined ? undefined : JSON.stringify(requestOptions.body),
          signal,
        });

        const payload: unknown = await response.json().catch(() => null);

        const statusIsAcceptable =
          response.ok || (requestOptions.treatStatusAsSuccess?.includes(response.status) ?? false);

        if (!statusIsAcceptable) {
          return err(toAppError(response.status, payload));
        }

        // Parse rather than trust. A contract drift is caught here, at the boundary.
        const parsed = requestOptions.schema.safeParse(payload);

        if (!parsed.success) {
          return err({
            category: 'INTERNAL',
            code: APP_ERROR_CODES.INTERNAL_ERROR,
            message: 'API response did not match the expected contract',
            details: { path: requestOptions.path },
          });
        }

        return ok(parsed.data);
      } catch (error) {
        return err(toTransportError(error));
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions<never>['query']): string {
  const url = new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  return url.toString();
}

/**
 * Maps an HTTP error response to the shared error shape.
 *
 * Prefers the server's own structured error when there is one — the server knows more than
 * the status code does. The status-based fallback exists for responses that never reached
 * the application (a proxy 502, a gateway timeout).
 */
function toAppError(status: number, payload: unknown): AppErrorShape {
  const serverError = (payload as { error?: AppErrorShape } | null)?.error;
  if (serverError?.code) return serverError;

  if (status === 401) {
    return {
      category: 'AUTHENTICATION',
      code: APP_ERROR_CODES.UNAUTHENTICATED,
      message: 'Not authenticated',
    };
  }
  if (status === 403) {
    return { category: 'AUTHORIZATION', code: APP_ERROR_CODES.FORBIDDEN, message: 'Not permitted' };
  }
  if (status === 404) {
    return { category: 'NOT_FOUND', code: APP_ERROR_CODES.RESOURCE_NOT_FOUND, message: 'Not found' };
  }
  if (status === 429) {
    return { category: 'RATE_LIMIT', code: APP_ERROR_CODES.RATE_LIMITED, message: 'Too many requests' };
  }

  return {
    category: status >= 500 ? 'UNAVAILABLE' : 'INTERNAL',
    code: status >= 500 ? APP_ERROR_CODES.DEPENDENCY_UNAVAILABLE : APP_ERROR_CODES.INTERNAL_ERROR,
    message: `Request failed with status ${status}`,
  };
}

function toTransportError(error: unknown): AppErrorShape {
  const aborted = error instanceof Error && error.name === 'AbortError';

  return {
    category: 'UNAVAILABLE',
    code: APP_ERROR_CODES.DEPENDENCY_UNAVAILABLE,
    message: aborted ? 'Request timed out or was cancelled' : 'Could not reach the Collection War API',
  };
}

/**
 * Combines abort signals.
 *
 * `AbortSignal.any` is not available in every runtime this client targets — notably some
 * React Native engines — so it is implemented rather than assumed.
 */
function anySignal(signals: readonly AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  return controller.signal;
}
