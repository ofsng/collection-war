import { defineConfig } from 'vitest/config';

/**
 * API integration tests, against real PostgreSQL in-process (PGlite — ADR-0025).
 *
 * These construct the real services with a PGlite-backed database handle and exercise the
 * real SQL and the real migrations. They are the evidence for CW-VS-001's acceptance
 * criteria.
 *
 * Nest's DI container is not booted — Vitest's esbuild transform does not emit the decorator
 * metadata its injector reads. Constructing the services directly tests the same logic with
 * one fewer moving part, and makes each service's dependencies visible in the test.
 *
 * NOT COVERED: concurrency. PGlite is single-connection.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
