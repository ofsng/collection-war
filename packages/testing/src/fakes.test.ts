import { describe, expect, it } from 'vitest';
import { createFakeEventPublisher, createFakeIdempotencyStore, createFakeUnitOfWork } from './fakes';
import { createIdSequence, testIdempotencyKey, testUuid } from './ids';
import { expectErr, expectErrorCode, expectOk } from './assertions';

/**
 * The fakes are themselves tested, because a fake with a bug produces green tests for
 * broken production code — the most expensive kind of failure to find.
 */

describe('fake idempotency store', () => {
  it('returns null on first reservation and the stored entry on the second', async () => {
    const store = createFakeIdempotencyStore();

    expect(await store.reserve('key-1', 'marketplace.purchase')).toBeNull();

    const second = await store.reserve('key-1', 'marketplace.purchase');
    expect(second).not.toBeNull();
    expect(second?.completed).toBe(false);
  });

  it('scopes keys by operation, so one key can be reused across different operations', async () => {
    const store = createFakeIdempotencyStore();

    expect(await store.reserve('key-1', 'marketplace.purchase')).toBeNull();
    expect(await store.reserve('key-1', 'rewards.claim')).toBeNull();
  });

  it('replays the stored result once completed', async () => {
    const store = createFakeIdempotencyStore();

    await store.reserve('key-1', 'rewards.claim');
    await store.complete('key-1', 'rewards.claim', { granted: 100 });

    const replay = await store.reserve('key-1', 'rewards.claim');

    expect(replay?.completed).toBe(true);
    expect(replay?.result).toEqual({ granted: 100 });
  });

  it('refuses to complete a key that was never reserved', async () => {
    // Skipping the reservation is precisely the bug that permits double execution, so the
    // fake must not tolerate it.
    const store = createFakeIdempotencyStore();

    await expect(store.complete('never-reserved', 'scope', {})).rejects.toThrow(/without being reserved/);
  });

  it('frees a key on release so a failed operation can be retried', async () => {
    const store = createFakeIdempotencyStore();

    await store.reserve('key-1', 'scope');
    await store.release('key-1', 'scope');

    expect(await store.reserve('key-1', 'scope')).toBeNull();
  });
});

describe('fake unit of work', () => {
  it('records a commit when the work succeeds', async () => {
    const unitOfWork = createFakeUnitOfWork();

    await unitOfWork.run(async () => 'done');

    expect(unitOfWork.commits).toHaveLength(1);
    expect(unitOfWork.rollbacks).toHaveLength(0);
  });

  it('records a rollback and rethrows when the work fails', async () => {
    // Lets a test assert that a failure rolled back, not merely that it returned an error.
    const unitOfWork = createFakeUnitOfWork();

    await expect(
      unitOfWork.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(unitOfWork.rollbacks).toHaveLength(1);
    expect(unitOfWork.commits).toHaveLength(0);
  });
});

describe('fake event publisher', () => {
  it('collects published events in order', async () => {
    const publisher = createFakeEventPublisher<{ name: string }>();

    await publisher.publish({ name: 'A.Happened' });
    await publisher.publishAll([{ name: 'B.Happened' }, { name: 'C.Happened' }]);

    expect(publisher.namesOf()).toEqual(['A.Happened', 'B.Happened', 'C.Happened']);
  });

  it('clears collected events between assertions', async () => {
    const publisher = createFakeEventPublisher<{ name: string }>();

    await publisher.publish({ name: 'A.Happened' });
    publisher.clear();

    expect(publisher.published).toHaveLength(0);
  });
});

describe('deterministic ids', () => {
  it('produces syntactically valid UUIDs', () => {
    // Fake ids must survive the same validation as real ones, or tests bypass it.
    expect(testUuid(1)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates a stable, readable sequence', () => {
    const nextId = createIdSequence('player');

    expect(nextId()).toBe('player-0001');
    expect(nextId()).toBe('player-0002');
  });

  it('produces URL-safe idempotency keys of a usable length', () => {
    const key = testIdempotencyKey('purchase');

    expect(key.length).toBeGreaterThanOrEqual(16);
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('result assertions', () => {
  it('unwraps a success', () => {
    expect(expectOk({ ok: true, value: 42 })).toBe(42);
  });

  it('explains what the error was when a success was expected', () => {
    expect(() => expectOk({ ok: false, error: { code: 'INSUFFICIENT_FUNDS' } })).toThrow(
      /INSUFFICIENT_FUNDS/,
    );
  });

  it('unwraps an error', () => {
    expect(expectErr({ ok: false, error: 'nope' })).toBe('nope');
  });

  it('names both codes when an error code does not match', () => {
    expect(() =>
      expectErrorCode(
        { ok: false, error: { category: 'PRECONDITION_FAILED', code: 'FEATURE_DISABLED', message: 'off' } },
        'INSUFFICIENT_FUNDS',
      ),
    ).toThrow(/Expected error code "INSUFFICIENT_FUNDS" but received "FEATURE_DISABLED"/);
  });
});
