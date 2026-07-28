import { defineConfig } from 'vitest/config';

/**
 * Unit tests only.
 *
 * `*.integration.test.ts` runs against PGlite and `*.postgres.test.ts` against a real server.
 * Both are excluded here so `pnpm test` stays fast and hermetic — they have their own
 * commands and their own configs.
 *
 *   pnpm --filter @collection-war/database run test:integration           (PGlite, always)
 *   pnpm --filter @collection-war/database run test:integration:postgres  (needs DATABASE_URL)
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/**/*.integration.test.ts',
      'src/**/*.postgres.test.ts',
    ],
  },
});
