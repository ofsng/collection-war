import type { Result } from '@collection-war/shared-types';

/**
 * Assertions for `Result`.
 *
 * Without these, every test that unwraps a Result writes the same four lines of narrowing,
 * and the failure message when it goes wrong is "expected true, got false" — which says
 * nothing about what actually failed.
 */

export function expectOk<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(
      `Expected a successful Result but got an error:\n${JSON.stringify(result.error, null, 2)}`,
    );
  }
  return result.value;
}

export function expectErr<T, E>(result: Result<T, E>): E {
  if (result.ok) {
    throw new Error(`Expected a failed Result but got a value:\n${JSON.stringify(result.value, null, 2)}`);
  }
  return result.error;
}

/** Asserts a specific error code, which is what callers actually branch on. */
export function expectErrorCode<T>(result: Result<T>, expectedCode: string): void {
  const error = expectErr(result);

  if (error.code !== expectedCode) {
    throw new Error(`Expected error code "${expectedCode}" but received "${error.code}": ${error.message}`);
  }
}
