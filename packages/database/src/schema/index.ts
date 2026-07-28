/**
 * Database schema.
 *
 * Only PLATFORM tables live here at bootstrap — infrastructure that any domain will need,
 * whose shape does not depend on unanswered game-design questions.
 *
 * Game tables are added per domain, in the phase described by
 * docs/tasks/BACKLOG.md, each with its own migration and its own review.
 */

export * from './outbox';
export * from './idempotency';
