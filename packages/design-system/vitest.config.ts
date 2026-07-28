import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // These primitives render DOM elements, so they need a DOM to render into.
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Required for React Testing Library's automatic cleanup: RTL registers an
    // `afterEach` unmount only when a global `afterEach` exists. Without it, every
    // rendered component stays in the document and the next test finds two of everything.
    globals: true,
  },
});
