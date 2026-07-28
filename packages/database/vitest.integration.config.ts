import { defineConfig } from 'vitest/config';

/**
 * Integration tests: these talk to a REAL PostgreSQL.
 *
 * Kept in a separate config, and behind the `require-database.mjs` gate, so that
 * `pnpm test` stays fast and hermetic while `pnpm test:integration` is honest about
 * needing infrastructure.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    // A test that opens a real connection is slower than a unit test, and a timeout that
    // is too tight produces flakes that get "fixed" by retrying.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Database tests share one schema; running files in parallel makes them fight over it.
    fileParallelism: false,
  },
});
