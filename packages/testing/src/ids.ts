/**
 * Deterministic identifier generation for tests.
 *
 * Random UUIDs in tests make failures unreproducible and snapshots unstable. These
 * generators produce valid, well-formed, sequential ids so that a failing assertion names
 * `player-0001`, which is something a human can reason about, rather than a fresh UUID
 * that means nothing.
 */

/**
 * Builds a syntactically valid UUIDv7 from a counter.
 *
 * Real UUID shape matters: code and schemas validate the format, so a fake id of `'1'`
 * would be rejected by the very validation the test is meant to exercise.
 */
export function testUuid(sequence: number): string {
  const hex = sequence.toString(16).padStart(12, '0');
  return `018f4c1a-7b2e-7000-8000-${hex}`;
}

export function createIdSequence(prefix = ''): () => string {
  let counter = 0;

  return () => {
    counter += 1;
    return prefix ? `${prefix}-${counter.toString().padStart(4, '0')}` : testUuid(counter);
  };
}

/** A valid idempotency key derived from a label, so a failure says which operation it was. */
export function testIdempotencyKey(label: string): string {
  return `test-${label}`
    .padEnd(16, '0')
    .slice(0, 64)
    .replace(/[^A-Za-z0-9_-]/g, '-');
}
