import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
  define: {
    // Next inlines `process.env.NEXT_PUBLIC_*` at build time. Vitest does not, so the
    // values are supplied here — otherwise `publicConfig` throws during import and every
    // test in the file fails for the wrong reason.
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify('http://localhost:4000'),
    'process.env.NEXT_PUBLIC_DEFAULT_LOCALE': JSON.stringify('tr-TR'),
  },
});
