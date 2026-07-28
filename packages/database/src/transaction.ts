import { sql } from 'drizzle-orm';
import {
  DEFAULT_TRANSACTION_OPTIONS,
  type IsolationLevel,
  type TransactionContext,
  type TransactionOptions,
  type UnitOfWork,
} from '@collection-war/domain';
import type { Database } from './client';

/**
 * The PostgreSQL implementation of `UnitOfWork`.
 *
 * Two things it does that a bare `db.transaction()` does not:
 *
 *   1. Applies the requested ISOLATION LEVEL. The default, READ COMMITTED, is not strong
 *      enough for the operations listed in `SERIALIZABLE_OPERATIONS` — those have
 *      invariants spanning rows that the statements themselves do not lock.
 *
 *   2. Retries SERIALIZATION FAILURES. Under SERIALIZABLE, PostgreSQL may abort a
 *      transaction (SQLSTATE 40001) that would have broken serializability. This is
 *      expected and normal, not an error condition — the correct response is to retry.
 *      Surfacing it to the player as a failure would make legitimate concurrent play look
 *      broken.
 */

/** Aborts PostgreSQL considers retryable. */
const RETRYABLE_SQL_STATES = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
]);

function isRetryable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    RETRYABLE_SQL_STATES.has((error as { code: string }).code)
  );
}

function isolationStatement(level: IsolationLevel): string {
  switch (level) {
    case 'SERIALIZABLE':
      return 'SERIALIZABLE';
    case 'REPEATABLE_READ':
      return 'REPEATABLE READ';
    case 'READ_COMMITTED':
      return 'READ COMMITTED';
  }
}

export function createUnitOfWork(db: Database): UnitOfWork {
  return {
    async run<T>(
      work: (context: TransactionContext) => Promise<T>,
      options?: TransactionOptions,
    ): Promise<T> {
      const isolationLevel = options?.isolationLevel ?? DEFAULT_TRANSACTION_OPTIONS.isolationLevel;
      const maxRetries =
        options?.maxSerializationRetries ?? DEFAULT_TRANSACTION_OPTIONS.maxSerializationRetries;

      let attempt = 0;

      for (;;) {
        attempt += 1;

        try {
          return await db.transaction(async (tx) => {
            await tx.execute(
              sql.raw(`SET TRANSACTION ISOLATION LEVEL ${isolationStatement(isolationLevel)}`),
            );

            return work({ transactionId: `tx-${attempt}-${Date.now()}` });
          });
        } catch (error) {
          if (!isRetryable(error) || attempt > maxRetries) {
            throw error;
          }

          // Small randomised backoff. Two transactions that just conflicted will conflict
          // again if they retry in lockstep.
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 10 * attempt));
        }
      }
    },
  };
}
