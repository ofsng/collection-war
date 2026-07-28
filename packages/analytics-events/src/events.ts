import { z } from 'zod';
import { isoTimestampSchema, localeSchema, uuidSchema } from '@collection-war/validation';

/**
 * Event naming convention: `domain.subject.verb_past_tense`, lower snake within segments.
 *   app.session.started      session.locale.changed      system.health.checked
 *
 * Once an event name ships it is permanent. Renaming one splits its historical series in
 * two, and no amount of downstream SQL fully repairs that. To change an event's meaning,
 * introduce a new name and deprecate the old one.
 */

/** Fields present on every event, added by the emitting client. */
export const analyticsEnvelopeSchema = z.object({
  /** Client-generated, so duplicates can be discarded by an at-least-once pipeline. */
  eventId: uuidSchema,
  name: z.string().regex(/^[a-z]+(\.[a-z_]+){2}$/, 'Event names must be domain.subject.verb_past'),
  occurredAt: isoTimestampSchema,
  /**
   * Pseudonymous, rotates on sign-out. NOT the player id, and never an email or device id.
   */
  anonymousId: uuidSchema,
  /** Present only for signed-in sessions; joined to player data server-side, never client-side. */
  playerId: uuidSchema.optional(),
  sessionId: uuidSchema,
  platform: z.enum(['web', 'ios', 'android', 'admin']),
  appVersion: z.string().max(32),
  locale: localeSchema,
});

export type AnalyticsEnvelope = z.infer<typeof analyticsEnvelopeSchema>;

/**
 * The events defined at bootstrap: platform lifecycle only.
 *
 * Gameplay analytics (battles, purchases, progression funnels) are deliberately absent —
 * designing them before the domains exist would guarantee they measure the wrong things.
 * See docs/status/DEFERRED_WORK.md.
 */
export const ANALYTICS_EVENTS = {
  APP_SESSION_STARTED: 'app.session.started',
  APP_SESSION_ENDED: 'app.session.ended',
  SESSION_LOCALE_CHANGED: 'session.locale.changed',
  SYSTEM_HEALTH_CHECKED: 'system.health.checked',
  APP_ERROR_DISPLAYED: 'app.error.displayed',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Per-event payload schemas. An event with no payload uses an empty object, not `null`. */
export const analyticsPayloadSchemas = {
  [ANALYTICS_EVENTS.APP_SESSION_STARTED]: z.object({
    coldStart: z.boolean(),
  }),
  [ANALYTICS_EVENTS.APP_SESSION_ENDED]: z.object({
    durationMs: z.number().int().min(0),
  }),
  [ANALYTICS_EVENTS.SESSION_LOCALE_CHANGED]: z.object({
    from: localeSchema,
    to: localeSchema,
  }),
  [ANALYTICS_EVENTS.SYSTEM_HEALTH_CHECKED]: z.object({
    healthy: z.boolean(),
    latencyMs: z.number().int().min(0),
  }),
  [ANALYTICS_EVENTS.APP_ERROR_DISPLAYED]: z.object({
    // A stable error CODE, never a message string. Messages contain user data and change
    // wording between releases, which breaks grouping.
    code: z.string().max(64),
    screen: z.string().max(64),
  }),
} as const;

export type AnalyticsPayload<TName extends AnalyticsEventName> = z.infer<
  (typeof analyticsPayloadSchemas)[TName]
>;

export type AnalyticsEvent<TName extends AnalyticsEventName = AnalyticsEventName> = AnalyticsEnvelope & {
  readonly name: TName;
  readonly payload: AnalyticsPayload<TName>;
};

/**
 * Validates one event end to end.
 *
 * The API runs this on ingest. Analytics is untrusted client input like any other: an
 * unvalidated event stream is both a data-quality problem and a storage-abuse vector.
 */
export function parseAnalyticsEvent(input: unknown): AnalyticsEvent | null {
  const envelope = analyticsEnvelopeSchema.safeParse(input);
  if (!envelope.success) return null;

  const name = envelope.data.name as AnalyticsEventName;
  const payloadSchema = analyticsPayloadSchemas[name] as z.ZodType | undefined;
  if (!payloadSchema) return null;

  const payload = payloadSchema.safeParse((input as { payload?: unknown }).payload);
  if (!payload.success) return null;

  return { ...envelope.data, name, payload: payload.data } as AnalyticsEvent;
}
