import { randomUUID } from 'node:crypto';
import type { CorrelationId } from '@collection-war/shared-types';

/**
 * Correlation ids.
 *
 * One player action — "buy this listing" — becomes an HTTP request, several database
 * statements, an outbox row, a queued job and a push notification. When it goes wrong,
 * the only way to reconstruct what happened is a single id threaded through all of it.
 *
 * See docs/architecture/OBSERVABILITY_ARCHITECTURE.md#correlation.
 */

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export function newCorrelationId(): CorrelationId {
  return randomUUID() as CorrelationId;
}

/**
 * Accepts a client-supplied correlation id, or mints one.
 *
 * A client-supplied id is convenience, not trust: it is echoed into logs, so it must be
 * bounded and character-restricted or it becomes a log-injection and log-flooding vector.
 * Anything that fails the check is silently replaced rather than rejected — a malformed
 * trace header should not fail a player's request.
 */
export function resolveCorrelationId(headerValue: string | string[] | undefined): CorrelationId {
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (typeof candidate === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(candidate)) {
    return candidate as CorrelationId;
  }

  return newCorrelationId();
}
