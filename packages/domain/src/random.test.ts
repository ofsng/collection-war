import { describe, expect, it } from 'vitest';
import { createSeededRandom, deriveSeed } from './random';
import { createFixedClock, createSystemClock } from './clock';

describe('createSeededRandom', () => {
  it('produces an identical sequence for an identical seed', () => {
    // This is the property the whole audit and anti-cheat story rests on. If it ever
    // fails, recorded battle outcomes stop being reproducible.
    const a = createSeededRandom('battle-018f4c1a');
    const b = createSeededRandom('battle-018f4c1a');

    const first = Array.from({ length: 50 }, () => a.next());
    const second = Array.from({ length: 50 }, () => b.next());

    expect(first).toEqual(second);
  });

  it('produces unrelated sequences for adjacent seeds', () => {
    // Sequential ids are the normal seed source, so `n` and `n+1` must not correlate.
    const a = createSeededRandom('battle-1');
    const b = createSeededRandom('battle-2');

    const first = Array.from({ length: 20 }, () => a.next());
    const second = Array.from({ length: 20 }, () => b.next());
    const positionsThatMatch = first.filter((value, index) => value === second[index]);

    expect(positionsThatMatch).toHaveLength(0);
  });

  it('stays within [0, 1)', () => {
    const random = createSeededRandom('range-check');

    for (let i = 0; i < 10_000; i += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('reaches both ends of an integer range', () => {
    // An off-by-one here would make the rarest drop unobtainable, or the worst outcome
    // impossible — both are silent balance bugs.
    const random = createSeededRandom('bounds');
    const seen = new Set<number>();

    for (let i = 0; i < 5_000; i += 1) seen.add(random.nextInt(1, 6));

    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('distributes integers roughly uniformly', () => {
    const random = createSeededRandom('distribution');
    const counts = new Array<number>(10).fill(0);
    const draws = 100_000;

    for (let i = 0; i < draws; i += 1) {
      const bucket = random.nextInt(0, 9);
      counts[bucket] = (counts[bucket] ?? 0) + 1;
    }

    // Each bucket should hold ~10%. A 2-point band is loose enough not to be flaky and
    // tight enough to catch a genuinely skewed generator.
    for (const count of counts) {
      expect(count / draws).toBeGreaterThan(0.08);
      expect(count / draws).toBeLessThan(0.12);
    }
  });

  it('handles a single-value range', () => {
    expect(createSeededRandom('single').nextInt(7, 7)).toBe(7);
  });

  it('rejects an inverted range instead of silently returning nonsense', () => {
    expect(() => createSeededRandom('bad').nextInt(10, 1)).toThrow(/inverted range/);
  });

  it('rejects non-integer bounds', () => {
    expect(() => createSeededRandom('bad').nextInt(1.5, 3)).toThrow(/must be integers/);
  });

  it('reports the seed that produced it, so a result can be replayed', () => {
    expect(createSeededRandom('replay-me').seed).toBe('replay-me');
  });
});

describe('deriveSeed', () => {
  it('gives each purpose an independent stream', () => {
    // Otherwise adding one new roll to battle logic would change every historical replay.
    const parent = 'battle-018f4c1a';
    const damage = createSeededRandom(deriveSeed(parent, 'damage'));
    const loot = createSeededRandom(deriveSeed(parent, 'loot'));

    expect(damage.next()).not.toBe(loot.next());
  });

  it('is stable across calls', () => {
    expect(deriveSeed('p', 'loot')).toBe(deriveSeed('p', 'loot'));
  });
});

describe('clock', () => {
  it('advances only when told to', () => {
    const clock = createFixedClock('2026-07-28T10:00:00.000Z' as never);

    const before = clock.nowMs();
    clock.advanceMs(4 * 60 * 60 * 1000);

    expect(clock.nowMs() - before).toBe(14_400_000);
    expect(clock.now()).toBe('2026-07-28T14:00:00.000Z');
  });

  it('refuses to move backwards', () => {
    const clock = createFixedClock('2026-07-28T10:00:00.000Z' as never);

    expect(() => clock.advanceMs(-1000)).toThrow(/cannot move backwards/);
  });

  it('rejects an invalid start timestamp', () => {
    expect(() => createFixedClock('yesterday' as never)).toThrow(/invalid timestamp/i);
  });

  it('emits UTC ISO timestamps from the system clock', () => {
    expect(createSystemClock().now()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
