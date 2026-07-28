import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApiClient } from './client';
import { createSystemApi } from './system';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const schema = z.object({ value: z.string() });

describe('createApiClient', () => {
  it('parses a successful response against its schema', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ value: 'hello' }));
    const client = createApiClient({ baseUrl: 'http://localhost:4000', fetchImpl });

    const result = await client.request({ path: '/thing', schema });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe('hello');
  });

  it('fails when the response does not match the contract', async () => {
    // A silent `as` cast here would let a changed server contract propagate as an
    // undefined property deep in a component.
    const fetchImpl = vi.fn(async () => jsonResponse({ unexpected: true }));
    const client = createApiClient({ baseUrl: 'http://localhost:4000', fetchImpl });

    const result = await client.request({ path: '/thing', schema });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/did not match the expected contract/);
  });

  it('prefers the server-supplied error over the status code', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        {
          error: {
            category: 'PRECONDITION_FAILED',
            code: 'INSUFFICIENT_FUNDS',
            message: 'Not enough gold',
          },
        },
        400,
      ),
    );
    const client = createApiClient({ baseUrl: 'http://localhost:4000', fetchImpl });

    const result = await client.request({ path: '/buy', method: 'POST', schema });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INSUFFICIENT_FUNDS');
  });

  it('maps bare status codes when the body carries no structured error', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:4000',
      fetchImpl: vi.fn(async () => new Response('Bad Gateway', { status: 502 })),
    });

    const result = await client.request({ path: '/thing', schema });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('UNAVAILABLE');
      expect(result.error.code).toBe('DEPENDENCY_UNAVAILABLE');
    }
  });

  it('returns an error instead of throwing when the network is unreachable', async () => {
    // A client application must render a retry state, not crash an error boundary.
    const client = createApiClient({
      baseUrl: 'http://localhost:4000',
      fetchImpl: vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    });

    const result = await client.request({ path: '/thing', schema });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/Could not reach/);
  });

  it('times out rather than hanging forever', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:4000',
      timeoutMs: 20,
      fetchImpl: vi.fn(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            (init?.signal as AbortSignal | undefined)?.addEventListener('abort', () => {
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            });
          }),
      ),
    });

    const result = await client.request({ path: '/slow', schema });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/timed out|cancelled/i);
  });
});

describe('request headers', () => {
  async function captureHeaders(overrides: Parameters<typeof createApiClient>[0]) {
    let captured: Headers | undefined;
    const fetchImpl = vi.fn(async (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      captured = new Headers(init?.headers);
      return jsonResponse({ value: 'ok' });
    });

    await createApiClient({ ...overrides, fetchImpl }).request({
      path: '/thing',
      method: 'POST',
      body: {},
      schema,
      idempotencyKey: 'idem-0123456789abcdef',
    });

    return captured!;
  }

  it('attaches the bearer token, locale, correlation id and idempotency key', async () => {
    const headers = await captureHeaders({
      baseUrl: 'http://localhost:4000',
      getAccessToken: () => 'token-abc',
      getLocale: () => 'tr-TR',
      getCorrelationId: () => 'corr-12345678',
    });

    expect(headers.get('authorization')).toBe('Bearer token-abc');
    expect(headers.get('accept-language')).toBe('tr-TR');
    expect(headers.get('x-correlation-id')).toBe('corr-12345678');
    expect(headers.get('idempotency-key')).toBe('idem-0123456789abcdef');
  });

  it('resolves the token per request, so an expired one is not reused', async () => {
    // Capturing the token at construction is a real and common bug: the client keeps
    // sending yesterday's token after a refresh.
    const tokens = ['first', 'second'];
    const getAccessToken = vi.fn(() => tokens.shift() ?? null);
    const fetchImpl = vi.fn(async () => jsonResponse({ value: 'ok' }));
    const client = createApiClient({ baseUrl: 'http://localhost:4000', getAccessToken, fetchImpl });

    await client.request({ path: '/a', schema });
    await client.request({ path: '/b', schema });

    expect(getAccessToken).toHaveBeenCalledTimes(2);
  });

  it('omits the authorization header when signed out', async () => {
    let captured: Headers | undefined;
    const fetchImpl = vi.fn(async (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      captured = new Headers(init?.headers);
      return jsonResponse({ value: 'ok' });
    });

    await createApiClient({
      baseUrl: 'http://localhost:4000',
      getAccessToken: () => null,
      fetchImpl,
    }).request({
      path: '/thing',
      schema,
    });

    expect(captured?.has('authorization')).toBe(false);
  });
});

describe('url construction', () => {
  it('joins the base url and path without duplicating slashes', async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: Parameters<typeof fetch>[0]) => {
      urls.push(String(url));
      return jsonResponse({ value: 'ok' });
    });

    const client = createApiClient({ baseUrl: 'http://localhost:4000/', fetchImpl });
    await client.request({ path: '/api/v1/system/info', schema });

    expect(urls[0]).toBe('http://localhost:4000/api/v1/system/info');
  });

  it('appends defined query parameters and omits undefined ones', async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: Parameters<typeof fetch>[0]) => {
      urls.push(String(url));
      return jsonResponse({ value: 'ok' });
    });

    await createApiClient({ baseUrl: 'http://localhost:4000', fetchImpl }).request({
      path: '/list',
      schema,
      query: { limit: 20, cursor: undefined },
    });

    expect(urls[0]).toContain('limit=20');
    expect(urls[0]).not.toContain('cursor');
  });
});

describe('system api', () => {
  it('validates the health response shape', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: 'ok', uptimeSeconds: 12.5, timestamp: '2026-07-28T10:00:00.000Z' }),
    );
    const system = createSystemApi(createApiClient({ baseUrl: 'http://localhost:4000', fetchImpl }));

    const result = await system.health();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('ok');
  });

  it('parses the readiness body even when the API answers 503', async () => {
    // 503 from /ready is a deliberate signal to load balancers, not a transport failure.
    // Discarding the body would throw away the dependency detail the caller asked for.
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        {
          status: 'degraded',
          timestamp: '2026-07-28T10:00:00.000Z',
          dependencies: {
            database: { status: 'down', latencyMs: 2000 },
            redis: { status: 'up', latencyMs: 1 },
          },
        },
        503,
      ),
    );
    const system = createSystemApi(createApiClient({ baseUrl: 'http://localhost:4000', fetchImpl }));

    const result = await system.readiness();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('degraded');
  });

  it('still treats a 503 from an ordinary endpoint as a failure', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ value: 'ignored' }, 503));
    const client = createApiClient({ baseUrl: 'http://localhost:4000', fetchImpl });

    const result = await client.request({ path: '/thing', schema });

    expect(result.ok).toBe(false);
  });

  it('surfaces a degraded readiness response', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        status: 'degraded',
        timestamp: '2026-07-28T10:00:00.000Z',
        dependencies: {
          database: { status: 'down', latencyMs: 2000 },
          redis: { status: 'up', latencyMs: 1 },
        },
      }),
    );
    const system = createSystemApi(createApiClient({ baseUrl: 'http://localhost:4000', fetchImpl }));

    const result = await system.readiness();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.dependencies.database.status).toBe('down');
  });
});
