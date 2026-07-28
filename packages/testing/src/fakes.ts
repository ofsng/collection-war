/**
 * In-memory test doubles.
 *
 * Each one enforces the same invariant its real counterpart does. A permissive fake makes
 * tests pass against behaviour that would fail in production, which is worse than having
 * no test — it creates confidence that is not earned.
 */

export interface StoredIdempotentResult {
  readonly key: string;
  readonly scope: string;
  readonly result: unknown;
  readonly completed: boolean;
}

/**
 * In-memory idempotency store.
 *
 * `reserve` is atomic here only because JavaScript is single-threaded; the real
 * implementation relies on a UNIQUE index. Tests written against this fake therefore
 * exercise the CALLER's handling of "already reserved", which is the part that has bugs.
 */
export function createFakeIdempotencyStore() {
  const entries = new Map<string, StoredIdempotentResult>();
  const compositeKey = (key: string, scope: string) => `${scope}::${key}`;

  return {
    entries,

    async reserve(key: string, scope: string): Promise<StoredIdempotentResult | null> {
      const existing = entries.get(compositeKey(key, scope));
      if (existing) return existing;

      entries.set(compositeKey(key, scope), { key, scope, result: null, completed: false });
      return null;
    },

    async complete(key: string, scope: string, result: unknown): Promise<void> {
      const existing = entries.get(compositeKey(key, scope));
      if (!existing) {
        // Completing a key that was never reserved means the caller skipped the
        // reservation, which is exactly the bug that allows double execution.
        throw new Error(`Idempotency key "${key}" was completed without being reserved`);
      }
      entries.set(compositeKey(key, scope), { ...existing, result, completed: true });
    },

    async release(key: string, scope: string): Promise<void> {
      entries.delete(compositeKey(key, scope));
    },
  };
}

/**
 * In-memory unit of work.
 *
 * Records commits and rollbacks so a test can assert that a failed operation rolled back
 * rather than merely that it returned an error — those are different, and only one of them
 * is safe.
 */
export function createFakeUnitOfWork() {
  const commits: string[] = [];
  const rollbacks: string[] = [];
  let sequence = 0;

  return {
    commits,
    rollbacks,

    async run<T>(work: (context: { transactionId: string }) => Promise<T>): Promise<T> {
      sequence += 1;
      const transactionId = `fake-tx-${sequence}`;

      try {
        const result = await work({ transactionId });
        commits.push(transactionId);
        return result;
      } catch (error) {
        rollbacks.push(transactionId);
        throw error;
      }
    },
  };
}

/** Collects published domain events so a test can assert on what was emitted. */
export function createFakeEventPublisher<TEvent extends { name: string }>() {
  const published: TEvent[] = [];

  return {
    published,

    async publish(event: TEvent): Promise<void> {
      published.push(event);
    },

    async publishAll(events: readonly TEvent[]): Promise<void> {
      published.push(...events);
    },

    namesOf(): string[] {
      return published.map((event) => event.name);
    },

    clear(): void {
      published.length = 0;
    },
  };
}
