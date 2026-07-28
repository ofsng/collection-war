import { describe, expect, it } from 'vitest';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from './queues';

describe('queue declarations', () => {
  it('keeps queue names unique', () => {
    // Two constants resolving to the same string would silently merge two workloads.
    const names = Object.values(QUEUE_NAMES);

    expect(new Set(names).size).toBe(names.length);
  });

  it('uses lowercase kebab-case names', () => {
    // Queue names appear in Redis keys and in dashboards; a consistent shape keeps them
    // greppable and avoids case-sensitivity surprises.
    for (const name of Object.values(QUEUE_NAMES)) {
      expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('declares the outbox relay, which every other domain event depends on', () => {
    expect(QUEUE_NAMES.OUTBOX_RELAY).toBe('outbox-relay');
  });
});

describe('default job options', () => {
  it('retries with exponential backoff rather than immediately', () => {
    // Immediate retries turn a transient dependency failure into a self-inflicted flood.
    expect(DEFAULT_JOB_OPTIONS.attempts).toBeGreaterThan(1);
    expect(DEFAULT_JOB_OPTIONS.backoff.type).toBe('exponential');
  });

  it('bounds retained job history instead of keeping everything or nothing', () => {
    // `false` grows Redis until it dies; `true` discards the history an incident needs.
    expect(DEFAULT_JOB_OPTIONS.removeOnComplete.count).toBeGreaterThan(0);
    expect(DEFAULT_JOB_OPTIONS.removeOnFail.count).toBeGreaterThan(0);
  });

  it('keeps failed jobs longer than successful ones', () => {
    // Failures are what someone will come back to investigate.
    expect(DEFAULT_JOB_OPTIONS.removeOnFail.count).toBeGreaterThan(
      DEFAULT_JOB_OPTIONS.removeOnComplete.count,
    );
  });
});

describe('bootstrap scope', () => {
  it('registers no game job processors', async () => {
    // Guards the explicit "no gameplay during bootstrap" constraint.
    const queueModule = await import('./queues');
    const exported = Object.keys(queueModule);

    const gameplaySurface = exported.filter((name) =>
      /battle|creature|expedition|marketplace|reward|craft/i.test(name),
    );

    expect(gameplaySurface).toEqual([]);
  });
});
