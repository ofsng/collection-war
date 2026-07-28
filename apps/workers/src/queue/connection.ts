import Redis from 'ioredis';

/**
 * The Redis connection used by BullMQ.
 *
 * The options below are not defaults — BullMQ requires some of them and misconfiguring
 * them produces failures that look like application bugs:
 *
 *   `maxRetriesPerRequest: null` is MANDATORY for BullMQ. Its blocking commands (BRPOPLPUSH)
 *   legitimately wait for a long time; with a retry cap, ioredis aborts them and BullMQ
 *   reports spurious connection errors.
 *
 *   `enableReadyCheck: false` avoids a startup race where BullMQ issues commands before
 *   ioredis has completed its INFO handshake.
 */
export function createQueueConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // Capped exponential backoff. Unbounded retries hammer a recovering Redis; giving up
    // entirely would make a brief blip permanent.
    retryStrategy: (times) => Math.min(times * 500, 10_000),
  });
}
