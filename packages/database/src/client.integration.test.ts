import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDatabase, type DatabaseHandle } from './client';
import { checkDatabaseHealth } from './health';
import { createUnitOfWork } from './transaction';

/**
 * Integration tests against a REAL PostgreSQL.
 *
 * Run with:  pnpm infra:up && pnpm test:integration
 *
 * NOT EXECUTED DURING THE BOOTSTRAP. Docker was unavailable on the bootstrap machine, so
 * these have never been run and must not be counted as passing. See
 * docs/status/BOOTSTRAP_ENVIRONMENT.md and docs/status/RISKS.md.
 */

let handle: DatabaseHandle;

beforeAll(() => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for integration tests');

  handle = createDatabase({ connectionString, maxConnections: 4, ssl: false });
});

afterAll(async () => {
  await handle?.close();
});

describe('database connectivity', () => {
  it('executes a query against the real server', async () => {
    const result = await handle.db.execute(sql`SELECT 1 AS value`);

    expect(result.rows[0]).toMatchObject({ value: 1 });
  });

  it('reports healthy through the readiness probe', async () => {
    const health = await checkDatabaseHealth(handle.db);

    expect(health.status).toBe('up');
  });

  it('runs on a server configured for UTC', async () => {
    // Every stored timestamp is UTC. A server defaulting to a local zone would silently
    // shift every expedition timer and listing expiry.
    const result = await handle.db.execute<{ setting: string }>(sql`SHOW timezone`);

    expect(['UTC', 'Etc/UTC']).toContain(result.rows[0]?.setting);
  });
});

describe('unit of work', () => {
  it('rolls back every statement when the callback throws', async () => {
    // The property the entire economy design depends on: partial writes are impossible.
    const unitOfWork = createUnitOfWork(handle.db);

    await handle.db.execute(sql`CREATE TEMPORARY TABLE IF NOT EXISTS rollback_probe (value integer)`);

    await expect(
      unitOfWork.run(async () => {
        await handle.db.execute(sql`INSERT INTO rollback_probe (value) VALUES (1)`);
        throw new Error('deliberate failure');
      }),
    ).rejects.toThrow('deliberate failure');

    const rows = await handle.db.execute<{ count: string }>(
      sql`SELECT count(*) AS count FROM rollback_probe`,
    );

    expect(Number(rows.rows[0]?.count)).toBe(0);
  });

  it('commits when the callback returns', async () => {
    const unitOfWork = createUnitOfWork(handle.db);

    const returned = await unitOfWork.run(async () => 'committed');

    expect(returned).toBe('committed');
  });

  it('honours the SERIALIZABLE isolation level', async () => {
    const unitOfWork = createUnitOfWork(handle.db);

    const level = await unitOfWork.run(
      async () => {
        const result = await handle.db.execute<{ transaction_isolation: string }>(
          sql`SHOW transaction_isolation`,
        );
        return result.rows[0]?.transaction_isolation;
      },
      { isolationLevel: 'SERIALIZABLE' },
    );

    expect(level).toBe('serializable');
  });
});
