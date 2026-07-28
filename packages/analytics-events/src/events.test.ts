import { describe, expect, it } from 'vitest';
import { ANALYTICS_EVENTS, analyticsPayloadSchemas, parseAnalyticsEvent } from './events';

const VALID_ENVELOPE = {
  eventId: '018f4c1a-7b2e-7c3d-9a1b-2c3d4e5f6a7b',
  name: ANALYTICS_EVENTS.SESSION_LOCALE_CHANGED,
  occurredAt: '2026-07-28T10:00:00.000Z',
  anonymousId: '018f4c1a-7b2e-7c3d-9a1b-2c3d4e5f6a7c',
  sessionId: '018f4c1a-7b2e-7c3d-9a1b-2c3d4e5f6a7d',
  platform: 'web',
  appVersion: '0.0.0',
  locale: 'tr-TR',
  payload: { from: 'tr-TR', to: 'en' },
};

describe('parseAnalyticsEvent', () => {
  it('accepts a well-formed event', () => {
    const parsed = parseAnalyticsEvent(VALID_ENVELOPE);

    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe('session.locale.changed');
  });

  it('rejects an unknown event name instead of storing it', () => {
    // An unrecognised name is either a client bug or someone probing the ingest endpoint.
    // Either way it must not become a row.
    expect(parseAnalyticsEvent({ ...VALID_ENVELOPE, name: 'made.up.event' })).toBeNull();
  });

  it('rejects a payload that does not match its event', () => {
    expect(parseAnalyticsEvent({ ...VALID_ENVELOPE, payload: { from: 'de-DE', to: 'en' } })).toBeNull();
  });

  it('rejects a malformed envelope', () => {
    expect(parseAnalyticsEvent({ ...VALID_ENVELOPE, anonymousId: 'not-a-uuid' })).toBeNull();
    expect(parseAnalyticsEvent({ ...VALID_ENVELOPE, occurredAt: '28/07/2026' })).toBeNull();
    expect(parseAnalyticsEvent(null)).toBeNull();
  });

  it('treats playerId as optional so signed-out sessions can be measured', () => {
    const parsed = parseAnalyticsEvent(VALID_ENVELOPE);

    expect(parsed?.playerId).toBeUndefined();
  });
});

describe('event contract', () => {
  it('defines a payload schema for every declared event name', () => {
    // A name without a schema would be silently dropped on ingest.
    for (const name of Object.values(ANALYTICS_EVENTS)) {
      expect(analyticsPayloadSchemas[name], `${name} has no payload schema`).toBeDefined();
    }
  });

  it('keeps every event name in the domain.subject.verb_past form', () => {
    for (const name of Object.values(ANALYTICS_EVENTS)) {
      expect(name).toMatch(/^[a-z]+(\.[a-z_]+){2}$/);
    }
  });

  it('carries no direct personal identifiers in any payload', () => {
    // A cheap structural guard on the privacy rule. It cannot prove the absence of PII,
    // but it catches the obvious additions during review.
    const forbidden = [
      'email',
      'displayName',
      'name',
      'ip',
      'ipAddress',
      'deviceId',
      'latitude',
      'longitude',
    ];

    for (const [eventName, schema] of Object.entries(analyticsPayloadSchemas)) {
      const shape = 'shape' in schema ? Object.keys(schema.shape as Record<string, unknown>) : [];
      for (const field of shape) {
        expect(forbidden, `${eventName}.${field} looks like personal data`).not.toContain(field);
      }
    }
  });
});
