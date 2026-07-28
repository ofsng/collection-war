import { sql } from 'drizzle-orm';
import type { Database } from './client';

/**
 * Database health probe.
 *
 * Used by the API's readiness endpoint. Deliberately a real round trip (`SELECT 1`) rather
 * than an inspection of pool state: a pool can report healthy while every connection in it
 * is pointed at a database that is gone.
 */

export interface DependencyHealth {
  readonly status: 'up' | 'down';
  readonly latencyMs: number;
  /** Present only when down. Never contains a connection string or credentials. */
  readonly error?: string;
}

export async function checkDatabaseHealth(db: Database, timeoutMs = 2_000): Promise<DependencyHealth> {
  const startedAt = Date.now();

  try {
    // A health check that can hang is worse than no health check: the orchestrator waits
    // on it instead of restarting the instance.
    await withTimeout(db.execute(sql`SELECT 1`), timeoutMs);

    return { status: 'up', latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - startedAt,
      // Message only. A pg connection error object carries the host, port and user.
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
