import type { CorrelationId, IsoTimestamp, Uuid } from '@collection-war/shared-types';

/**
 * Domain events.
 *
 * A domain event is a statement of fact: something happened, in the past tense, and it is
 * not negotiable. `MarketplaceListingSold`, never `SellListing`.
 *
 * Events are how modules stay decoupled without becoming distributed. When a marketplace
 * sale completes, the marketplace module does not call the notification module, the quest
 * module and the analytics module — it publishes one event. See
 * docs/architecture/EVENT_ARCHITECTURE.md.
 *
 * WHEN NOT TO USE AN EVENT: if the caller needs the result, or the operation must fail
 * when the follow-up fails, that is a direct call inside one transaction, not an event.
 * Events are for consequences that may lag.
 */

/**
 * Event names are `Domain.SubjectVerbedPast`, e.g. `Marketplace.ListingSold`.
 *
 * The version suffix is not decoration. A consumer written against v1 must keep working
 * after v2 ships, because a queued v1 payload may still be in flight during a deploy.
 */
export interface DomainEvent<TName extends string = string, TPayload = unknown> {
  readonly eventId: Uuid;
  readonly name: TName;
  /** Incremented when the payload shape changes incompatibly. Never reused. */
  readonly version: number;
  readonly occurredAt: IsoTimestamp;
  /** The entity the event is about, so consumers can order events per aggregate. */
  readonly aggregateType: string;
  readonly aggregateId: Uuid;
  readonly correlationId: CorrelationId;
  readonly payload: TPayload;
}

/**
 * Publishes events.
 *
 * The production implementation writes to the transactional outbox inside the caller's
 * database transaction — it does NOT deliver anything itself. That is what makes
 * "the sale committed but the notification was lost" impossible. See `./outbox`.
 */
export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: readonly DomainEvent[]): Promise<void>;
}

/**
 * Consumes events.
 *
 * `handle` MUST be idempotent. Delivery is at-least-once: a consumer that crashes after
 * doing its work but before acknowledging will see the same event again. A handler that
 * grants a reward without checking whether it already did is a duplication bug waiting
 * for its first retry.
 */
export interface DomainEventHandler<TEvent extends DomainEvent = DomainEvent> {
  readonly eventName: TEvent['name'];
  readonly eventVersion: number;
  handle(event: TEvent): Promise<void>;
}

/** In-memory publisher for tests and for domain code that has no transaction yet. */
export function createCollectingPublisher(): DomainEventPublisher & { readonly collected: DomainEvent[] } {
  const collected: DomainEvent[] = [];

  return {
    collected,
    async publish(event) {
      collected.push(event);
    },
    async publishAll(events) {
      collected.push(...events);
    },
  };
}
