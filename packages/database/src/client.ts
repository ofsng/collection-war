import { Pool, type PoolConfig } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

/**
 * The PostgreSQL connection pool and Drizzle client.
 *
 * One pool per process. Creating a pool per request exhausts PostgreSQL's connection
 * limit long before it exhausts anything else, and the failure looks like an unrelated
 * outage.
 */

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseOptions {
  readonly connectionString: string;
  readonly maxConnections: number;
  readonly ssl: boolean;
  /**
   * Fail a connection attempt rather than queueing forever. A request that waits
   * indefinitely for a connection holds its own resources while doing so, which is how one
   * slow query becomes a total outage.
   */
  readonly connectionTimeoutMs?: number;
  readonly idleTimeoutMs?: number;
}

export interface DatabaseHandle {
  readonly db: Database;
  readonly pool: Pool;
  close(): Promise<void>;
}

export function createDatabase(options: DatabaseOptions): DatabaseHandle {
  const config: PoolConfig = {
    connectionString: options.connectionString,
    max: options.maxConnections,
    connectionTimeoutMillis: options.connectionTimeoutMs ?? 5_000,
    idleTimeoutMillis: options.idleTimeoutMs ?? 30_000,
    // `rejectUnauthorized: false` would accept any certificate, which makes TLS
    // decorative. If a managed provider needs a custom CA, supply the CA — do not disable
    // verification. See docs/security/SECURITY_ARCHITECTURE.md.
    ssl: options.ssl ? { rejectUnauthorized: true } : false,
  };

  const pool = new Pool(config);

  // An idle client erroring (network blip, server restart) emits on the pool. Without a
  // listener, Node treats it as an unhandled 'error' event and terminates the process.
  pool.on('error', (error) => {
    process.emitWarning(`Idle PostgreSQL client error: ${error.message}`, 'DatabasePoolWarning');
  });

  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    async close() {
      await pool.end();
    },
  };
}
