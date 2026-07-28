#!/usr/bin/env node
/**
 * Applies pending migrations — `pnpm db:migrate`.
 *
 * Plain JavaScript rather than TypeScript on purpose: migration is the one operation that
 * must work even when the build is broken, and requiring a compile step to repair a
 * database is a bad position to be in during an incident.
 */
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(PACKAGE_ROOT, 'drizzle');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    [
      '',
      '✖ DATABASE_URL is not set.',
      '',
      '  Migrations must never fall back to a default connection string: a default would',
      '  eventually be pointed at the wrong environment and migrate the wrong database.',
      '',
      '  Local development:  cp .env.example .env && pnpm infra:up',
      '  Then:               DATABASE_URL=... pnpm db:migrate',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

if (
  !existsSync(MIGRATIONS_DIR) ||
  readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).length === 0
) {
  console.log(
    [
      '',
      'No migration files found in packages/database/drizzle/.',
      '',
      '  This is expected at bootstrap: only platform tables are defined so far, and no',
      '  migration has been generated yet. Generate one with:',
      '',
      '    pnpm db:generate',
      '',
      '  Review the emitted SQL before committing it. See docs/runbooks/MIGRATIONS.md.',
      '',
    ].join('\n'),
  );
  process.exit(0);
}

const pool = new pg.Pool({ connectionString, max: 1 });

try {
  console.log('Applying migrations...');
  await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_DIR });
  console.log('✔ Migrations applied.');
} catch (error) {
  // Message only. A pg error object carries host, port, user and sometimes the failing
  // statement's parameters.
  console.error(`\n✖ Migration failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
