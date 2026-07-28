/**
 * Queue names.
 *
 * Declared centrally because a queue name is a distributed contract: a producer and a
 * consumer in different processes must agree exactly, and a typo produces jobs that are
 * enqueued successfully and never processed — the hardest kind of failure to notice.
 *
 * These queues are DECLARED but not yet SERVED. Nothing produces to them and nothing
 * consumes from them; they document the intended decomposition so the first real job has
 * an obvious home.
 */
export const QUEUE_NAMES = {
  /**
   * Relays transactional-outbox rows to their consumers. This will be the first queue with
   * a real processor, because every other domain's events depend on it.
   */
  OUTBOX_RELAY: 'outbox-relay',

  /** Push, email and in-app delivery. */
  NOTIFICATIONS: 'notifications',

  /** Time-based game state: expedition completion, cooldown expiry, listing expiry. */
  SCHEDULED: 'scheduled',

  /** Analytics forwarding and aggregation. Lowest priority; never blocks player-facing work. */
  ANALYTICS: 'analytics',

  /** Operational chores: idempotency-key sweeping, dead-letter reporting. */
  MAINTENANCE: 'maintenance',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Default job options.
 *
 * `removeOnComplete` is a bounded number rather than `true` or `false` on purpose. `false`
 * grows Redis memory without limit until the instance dies; `true` discards the history
 * that makes an incident explainable. A bounded window keeps recent history and bounds
 * memory.
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 1_000 },
  removeOnComplete: { count: 1_000 },
  // Failures are kept longer than successes: they are the ones someone will investigate.
  removeOnFail: { count: 5_000 },
} as const;
