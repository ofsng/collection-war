import { defineConfig } from 'vitest/config';

/**
 * Mobile unit tests.
 *
 * SCOPE: pure logic only — locale resolution, configuration, storage adapters. React
 * Native COMPONENTS are not rendered here.
 *
 * That is a deliberate, stated limitation rather than an omission. Rendering RN components
 * under Vitest needs the react-native preset, a Metro-compatible transform and mocks for
 * every native module; the result tests a simulation of React Native rather than React
 * Native. Component and interaction coverage for mobile belongs on a device or emulator
 * (Maestro or Detox), which needs infrastructure this bootstrap did not create.
 *
 * Recorded in docs/status/DEFERRED_WORK.md. The mobile shell's verification at bootstrap
 * is therefore: typecheck + lint + these logic tests. It has NOT been run on a device.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Native modules have no Node implementation. Aliasing them to local stubs keeps the
      // logic under test importable without pretending the native behaviour is covered.
      'expo-localization': new URL('./src/test-stubs/expo-localization.ts', import.meta.url).pathname,
      'expo-secure-store': new URL('./src/test-stubs/expo-secure-store.ts', import.meta.url).pathname,
    },
  },
});
