import { defineConfig } from 'vitest/config';

/**
 * Unit tests only.
 *
 * `*.integration.test.ts` is excluded because those files need a real PostgreSQL. Without
 * this exclusion, `pnpm test` would fail on a machine with no database — which would train
 * everyone to ignore a red `test` run, and a quality gate that people ignore is worse than
 * no gate at all.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'src/**/*.integration.test.ts'],
  },
});
