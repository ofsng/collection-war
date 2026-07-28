import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the API.
 *
 * These construct controllers, services and filters DIRECTLY, passing their dependencies
 * as constructor arguments, rather than booting a Nest testing module.
 *
 * The reason is concrete: Vitest transforms TypeScript with esbuild, which does not emit
 * the `design:paramtypes` decorator metadata that Nest's injector reads. Booting the
 * container under Vitest therefore requires an additional SWC transform layer. Since
 * every class here is a plain class with an explicit constructor, direct construction
 * tests the same logic with one fewer moving part — and it makes the dependencies of each
 * unit visible in the test itself.
 *
 * Wiring is verified separately, by `*.integration.test.ts`, which boots the real
 * application via `nest build` output against real infrastructure.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'src/**/*.integration.test.ts'],
    environment: 'node',
  },
});
