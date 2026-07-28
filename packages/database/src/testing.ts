import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';

/**
 * An in-process PostgreSQL for tests.
 *
 * PGlite is PostgreSQL 18 compiled to WASM. It enforces CHECK constraints, unique indexes,
 * foreign keys and transactions exactly as the real server does, so the integrity guarantees
 * this project depends on can finally be tested — on any machine, with no Docker.
 *
 * See ADR-0025 for why this exists and, importantly, what it does NOT cover:
 *
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │ PGlite is SINGLE-CONNECTION. It cannot run two transactions at once, so │
 *   │ it CANNOT test concurrent double-spend, a real 40001 serialization      │
 *   │ failure, or the retry path in createUnitOfWork.                         │
 *   │                                                                          │
 *   │ Those tests stay gated on real PostgreSQL. Passing here is NOT evidence │
 *   │ that concurrent access is safe.                                          │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *
 * TEST-ONLY. Never imported by production code.
 */

export type TestDatabase = PgliteDatabase<typeof schema>;

export interface TestDatabaseHandle {
  readonly db: TestDatabase;
  readonly client: PGlite;
  close(): Promise<void>;
}

// `__dirname` rather than `import.meta.url`: this package compiles to CommonJS so that
// NestJS, Next.js and Metro can all consume it (ADR-0014).
const MIGRATIONS_DIR = join(__dirname, '..', 'drizzle');

/**
 * Creates a fresh database with the real migrations applied.
 *
 * The migrations are the **committed SQL**, not a schema push — so a migration that would
 * fail against PostgreSQL fails here too, which is the point. A test harness that built the
 * schema a different way would prove nothing about the migrations that actually ship.
 */
export async function createTestDatabase(): Promise<TestDatabaseHandle> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    throw new Error(
      `No migrations found in ${MIGRATIONS_DIR}. Run \`pnpm db:generate\` before running integration tests.`,
    );
  }

  for (const file of files) {
    const sqlText = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');

    // drizzle-kit separates statements with this marker. Splitting on it rather than on `;`
    // keeps function bodies and dollar-quoted strings intact.
    for (const statement of sqlText.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed.length > 0) await client.exec(trimmed);
    }
  }

  return {
    db,
    client,
    async close() {
      await client.close();
    },
  };
}

/** Deterministic UUIDv7-shaped ids, so a failing assertion names something a human can follow. */
export function testId(sequence: number): string {
  return `018f4c1a-7b2e-7000-8000-${sequence.toString(16).padStart(12, '0')}`;
}
