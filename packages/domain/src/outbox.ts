import type { IsoTimestamp, Uuid } from '@collection-war/shared-types';
import type { DomainEvent } from './events';

/**
 * Transactional outbox contract.
 *
 * THE PROBLEM. A marketplace purchase must do two things: commit a database transaction
 * (money moves, ownership transfers) and cause a side effect (notify the seller). These
 * are different systems, so there is no shared transaction. Whichever you do second can
 * fail after the first succeeded:
 *   - Publish first: the message goes out, the transaction rolls back, and the seller is
 *     told they sold something they still own.
 *   - Commit first: the sale is real, the process dies, and nobody is ever notified.
 *
 * THE SOLUTION. Write the event as a ROW, in the same transaction as the business change.
 * If the transaction commits, the event exists. If it rolls back, so does the event.
 * A separate relay process then reads unpublished rows and delivers them, retrying until
 * it succeeds.
 *
 * The guarantee this buys is AT-LEAST-ONCE delivery, never exactly-once. Consumers must
 * be idempotent — see `DomainEventHandler`.
 *
 * NOT IMPLEMENTED AT BOOTSTRAP. The table, the relay worker and the retry policy are
 * designed here and built in the next phase (docs/architecture/EVENT_ARCHITECTURE.md).
 */

export type OutboxStatus = 'PENDING' | 'PUBLISHED' | 'FAILED' | 'DEAD_LETTER';

export interface OutboxRecord {
  readonly id: Uuid;
  readonly event: DomainEvent;
  readonly status: OutboxStatus;
  readonly attempts: number;
  readonly createdAt: IsoTimestamp;
  readonly publishedAt: IsoTimestamp | null;
  /** When the relay may next try. Exponential backoff writes this. */
  readonly nextAttemptAt: IsoTimestamp | null;
  /** Last failure, for diagnosis. Never contains a secret. */
  readonly lastError: string | null;
}

/**
 * Retry policy.
 *
 * After `maxAttempts` the record moves to `DEAD_LETTER` rather than being dropped or
 * retried forever. Dropping loses a real business fact; retrying forever turns one broken
 * message into a permanently saturated relay. A dead letter is a thing a human is alerted
 * to and can replay.
 */
export interface OutboxRetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export const DEFAULT_OUTBOX_RETRY_POLICY: OutboxRetryPolicy = {
  maxAttempts: 8,
  baseDelayMs: 1_000,
  maxDelayMs: 60 * 60 * 1000,
};

/**
 * Exponential backoff with full jitter.
 *
 * Jitter is not a refinement. Without it, every message that failed during an outage
 * retries at the same instant when the dependency recovers, and the recovery is
 * immediately undone by the stampede.
 */
export function nextRetryDelayMs(attempt: number, policy: OutboxRetryPolicy, random: () => number): number {
  const exponential = Math.min(policy.baseDelayMs * 2 ** Math.max(0, attempt - 1), policy.maxDelayMs);
  return Math.floor(random() * exponential);
}

export interface OutboxRepository {
  /** MUST be called inside the caller's transaction. */
  enqueue(event: DomainEvent): Promise<void>;
  claimPending(limit: number): Promise<readonly OutboxRecord[]>;
  markPublished(id: Uuid): Promise<void>;
  markFailed(id: Uuid, error: string, nextAttemptAt: IsoTimestamp): Promise<void>;
  markDeadLettered(id: Uuid, error: string): Promise<void>;
}
