import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { schema } from '@collection-war/database';

/**
 * Idempotency, enforced by the database.
 *
 * A mobile client on a poor connection retries. Without this, the retry of "claim my battle
 * rewards" grants them twice.
 *
 * THE MECHANISM IS THE UNIQUE INDEX on `(key, scope)`, not the code below. An
 * application-level check-then-insert is a race, and under concurrency the race resolves as
 * a double grant — which is precisely the bug this prevents.
 */

/** How long a key is honoured. Long enough for a late retry; not forever. */
const RETENTION_HOURS = 24;

export type Transaction = Parameters<
  Parameters<typeof schema.users.$inferSelect extends never ? never : TransactionRunner>[0]
>[0];

type TransactionRunner = (callback: (tx: never) => Promise<unknown>) => Promise<unknown>;

export interface ReservationHit<T> {
  readonly replayed: true;
  readonly result: T;
}

export interface ReservationMiss {
  readonly replayed: false;
}

/**
 * Reserves an idempotency key inside the caller's transaction.
 *
 * Returns the stored result when the key has already completed, so a retry returns the
 * ORIGINAL outcome rather than performing the work again.
 *
 * If the key exists but has not completed, the original request is still in flight; the
 * caller should return 409 and let the client retry shortly rather than racing it.
 */
export async function reserveIdempotencyKey<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle's transaction type is not exported in a usable form
  tx: any,
  key: string,
  scope: string,
  playerId: string,
): Promise<ReservationHit<T> | ReservationMiss | 'IN_PROGRESS'> {
  const existing = await tx
    .select()
    .from(schema.idempotencyKeys)
    .where(and(eq(schema.idempotencyKeys.key, key), eq(schema.idempotencyKeys.scope, scope)))
    .limit(1);

  const row = existing[0];

  if (row) {
    if (row.status === 'COMPLETED') {
      return { replayed: true, result: row.result as T };
    }
    return 'IN_PROGRESS';
  }

  // The insert is what actually claims the key. Under concurrency one wins and the other
  // gets a unique violation, which surfaces as a failed transaction — the correct outcome.
  await tx.insert(schema.idempotencyKeys).values({
    id: randomUUID(),
    key,
    scope,
    playerId,
    status: 'IN_PROGRESS',
    expiresAt: new Date(Date.now() + RETENTION_HOURS * 3_600_000),
  });

  return { replayed: false };
}

/** Stores the outcome against the key, so a later retry can replay it. */
export async function completeIdempotencyKey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  tx: any,
  key: string,
  scope: string,
  result: unknown,
): Promise<void> {
  await tx
    .update(schema.idempotencyKeys)
    .set({ status: 'COMPLETED', result, completedAt: new Date() })
    .where(and(eq(schema.idempotencyKeys.key, key), eq(schema.idempotencyKeys.scope, scope)));
}
