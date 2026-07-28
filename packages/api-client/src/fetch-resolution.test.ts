import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApiClient } from './client';

const schema = z.object({ value: z.string() });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetch resolution', () => {
  it('resolves globalThis.fetch per request, not at construction', async () => {
    // Regression guard. Client applications create their API client at module scope, so a
    // fetch captured at construction binds whatever existed at import time. That silently
    // bypassed every test stub in apps/web until it was fixed.
    const client = createApiClient({ baseUrl: 'http://localhost:4000' });

    const stub = vi.fn(
      async () =>
        new Response(JSON.stringify({ value: 'from-stub' }), {
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', stub);

    const result = await client.request({ path: '/thing', schema });

    expect(stub).toHaveBeenCalledOnce();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe('from-stub');
  });

  it('returns an error rather than throwing when no fetch exists at all', async () => {
    const client = createApiClient({ baseUrl: 'http://localhost:4000' });
    vi.stubGlobal('fetch', undefined);

    const result = await client.request({ path: '/thing', schema });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/No fetch implementation/);
  });
});
