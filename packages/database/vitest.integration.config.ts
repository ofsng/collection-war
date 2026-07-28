import { defineConfig } from 'vitest/config';

/**
 * Integration tests against REAL PostgreSQL, in-process via PGlite.
 *
 * These need no Docker and no `DATABASE_URL`, so they run everywhere — which is the whole
 * point of ADR-0025. They apply the committed migrations and exercise the real constraints.
 *
 * WHAT THEY DO NOT COVER: PGlite is single-connection, so concurrent double-spend, real
 * serialization failures and the retry path are NOT tested here. Those live in
 * `vitest.postgres.config.ts` and require a real server.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    // WASM start-up plus migrations. A tight timeout here produces flakes that get "fixed"
    // by retrying rather than by understanding.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // One database per file; files must not share an instance.
    fileParallelism: false,
  },
});
