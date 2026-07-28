import { defineConfig } from 'vitest/config';

/**
 * Tests that require a REAL PostgreSQL server.
 *
 * Everything here needs behaviour PGlite cannot provide — genuine concurrency, connection
 * pooling, serialization conflicts. Gated by `require-database.mjs`, which exits non-zero
 * with an explanation rather than skipping: a suite that silently skips produces a green run
 * that tested nothing.
 *
 *   pnpm infra:up && pnpm --filter @collection-war/database run test:integration:postgres
 */
export default defineConfig({
  test: {
    include: ['src/**/*.postgres.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
