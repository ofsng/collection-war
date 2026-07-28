import { describe, expect, it, vi } from 'vitest';
import { checkDatabaseHealth, withTimeout } from './health';
import type { Database } from './client';

/**
 * These are UNIT tests against injected fakes. They verify the probe's own behaviour —
 * timeout handling, error shaping, latency measurement — not that PostgreSQL is reachable.
 *
 * Proving real connectivity requires a running database and belongs to
 * `vitest.integration.config.ts`, which is gated on `pnpm infra:up`. Docker was not
 * available when this was written, so that gate has NOT been exercised; see
 * docs/status/BOOTSTRAP_ENVIRONMENT.md.
 */

function fakeDatabase(execute: () => Promise<unknown>): Database {
  return { execute } as unknown as Database;
}

describe('checkDatabaseHealth', () => {
  it('reports up when the query succeeds', async () => {
    const health = await checkDatabaseHealth(fakeDatabase(async () => ({ rows: [{ '?column?': 1 }] })));

    expect(health.status).toBe('up');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    expect(health.error).toBeUndefined();
  });

  it('reports down instead of throwing when the query fails', async () => {
    // A readiness probe that throws takes the whole endpoint down with it, turning a
    // degraded dependency into a total outage.
    const health = await checkDatabaseHealth(
      fakeDatabase(async () => {
        throw new Error('connection refused');
      }),
    );

    expect(health.status).toBe('down');
    expect(health.error).toBe('connection refused');
  });

  it('reports down rather than hanging when the database does not answer', async () => {
    const health = await checkDatabaseHealth(
      fakeDatabase(() => new Promise(() => undefined)),
      50,
    );

    expect(health.status).toBe('down');
    expect(health.error).toMatch(/Timed out/);
  });

  it('does not leak connection details into the error', async () => {
    // pg error objects carry host, port and user. Only the message is surfaced.
    const pgStyleError = Object.assign(new Error('password authentication failed'), {
      host: 'db.internal',
      port: 5432,
      user: 'collection_war',
    });

    const health = await checkDatabaseHealth(
      fakeDatabase(async () => {
        throw pgStyleError;
      }),
    );

    expect(JSON.stringify(health)).not.toContain('db.internal');
    expect(JSON.stringify(health)).not.toContain('5432');
  });
});

describe('withTimeout', () => {
  it('resolves when the promise wins', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('rejects when the timeout wins', async () => {
    await expect(withTimeout(new Promise(() => undefined), 10)).rejects.toThrow(/Timed out after 10ms/);
  });

  it('clears its timer so a fast promise does not keep the process alive', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    await withTimeout(Promise.resolve('ok'), 60_000);

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('wraps a non-Error rejection so callers always receive an Error', async () => {
    await expect(withTimeout(Promise.reject('a string'), 1000)).rejects.toBeInstanceOf(Error);
  });
});
