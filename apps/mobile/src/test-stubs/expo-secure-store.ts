/**
 * Test stub for `expo-secure-store`.
 *
 * An in-memory map. It intentionally does NOT emulate the keychain's security properties —
 * those cannot be tested off-device, and pretending otherwise would be the kind of false
 * confidence this project's testing rules forbid.
 */

const store = new Map<string, string>();
let failNextOperation = false;

export async function getItemAsync(key: string): Promise<string | null> {
  if (failNextOperation) {
    failNextOperation = false;
    throw new Error('SecureStore unavailable');
  }
  return store.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (failNextOperation) {
    failNextOperation = false;
    throw new Error('SecureStore unavailable');
  }
  store.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
}

/** Test-only controls. */
export function __reset(): void {
  store.clear();
  failNextOperation = false;
}

export function __failNext(): void {
  failNextOperation = true;
}
