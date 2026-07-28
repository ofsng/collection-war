import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement `crypto.randomUUID`, which the API client uses to mint
 * correlation ids. Without this the client throws on its first request in a test.
 */
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { ...globalThis.crypto, randomUUID: () => '00000000-0000-4000-8000-000000000000' },
    configurable: true,
  });
}
