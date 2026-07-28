import type { AppErrorShape } from './errors';

/**
 * Explicit success/failure for expected outcomes.
 *
 * Throwing is reserved for genuinely exceptional conditions — a lost database
 * connection, a bug. "Not enough gold", "listing already sold", "creature is not yours"
 * are ordinary business outcomes that every caller must handle, so they are returned,
 * not thrown. The compiler then refuses to let a caller ignore them.
 */

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E = AppErrorShape> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E = AppErrorShape> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E = AppErrorShape>(error: E): Err<E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/**
 * Unwraps a success or throws. Legitimate in tests and at the outermost transport
 * boundary where an unexpected failure should become a 500. Using it inside domain logic
 * defeats the purpose of the type.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(`Attempted to unwrap a failed Result: ${JSON.stringify(result.error)}`);
}
