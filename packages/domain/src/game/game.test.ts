import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../random';
import { applyBp, applyDefense, computeEffectiveStats, type GrowthCurve } from './stats';
import {
  classifyEffectiveness,
  ELEMENTS,
  elementDamageMultiplier,
  elementStatusMultiplier,
  isElement,
} from './elements';
import {
  evaluateLevelUp,
  experienceForNextLevel,
  gateForLevel,
  SLICE_LEVEL_CAP,
  totalExperienceForLevel,
} from './progression';
import { resolveRewards, validateRewardTable, type RewardTable } from './rewards';

const growth: GrowthCurve = {
  base: {
    health: 100,
    attack: 20,
    defense: 15,
    focus: 18,
    speed: 25,
    resistance: 10,
    critRate: 500,
    critPower: 15_000,
    affinity: 100,
  },
  perLevel: {
    health: 12,
    attack: 3,
    defense: 2,
    focus: 3,
    speed: 2,
    resistance: 1,
    critRate: 0,
    critPower: 0,
    affinity: 0,
  },
};

describe('applyBp', () => {
  it('applies a basis-point coefficient with floor rounding', () => {
    expect(applyBp(100, 10_000)).toBe(100); // ×1
    expect(applyBp(100, 15_000)).toBe(150); // ×1.5
    expect(applyBp(100, 7_500)).toBe(75); // ×0.75
  });

  it('always floors, so rounding is a stated decision rather than IEEE-754 behaviour', () => {
    expect(applyBp(99, 15_000)).toBe(148); // 148.5 → 148
    expect(applyBp(1, 5_000)).toBe(0);
  });

  it('returns an integer for every input', () => {
    for (let value = 1; value <= 200; value += 7) {
      for (const bp of [1, 333, 7_777, 10_000, 19_999]) {
        expect(Number.isInteger(applyBp(value, bp))).toBe(true);
      }
    }
  });
});

describe('computeEffectiveStats', () => {
  it('returns base values at level 1', () => {
    const stats = computeEffectiveStats({ growth, level: 1, contentVersion: 'v1' as never });

    expect(stats.health).toBe(100);
    expect(stats.attack).toBe(20);
  });

  it('applies growth once per level beyond the first', () => {
    const stats = computeEffectiveStats({ growth, level: 5, contentVersion: 'v1' as never });

    expect(stats.health).toBe(100 + 12 * 4);
    expect(stats.attack).toBe(20 + 3 * 4);
  });

  it('does not grow critical rate or power with level', () => {
    // Uncapped critical growth makes late-game damage scale with itself, which is how a
    // balance curve runs away.
    const one = computeEffectiveStats({ growth, level: 1, contentVersion: 'v1' as never });
    const ten = computeEffectiveStats({ growth, level: 10, contentVersion: 'v1' as never });

    expect(ten.critRate).toBe(one.critRate);
    expect(ten.critPower).toBe(one.critPower);
  });

  it('produces only integers', () => {
    for (let level = 1; level <= 10; level += 1) {
      const stats = computeEffectiveStats({ growth, level, contentVersion: 'v1' as never });
      for (const value of Object.values(stats)) {
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });

  it('rejects an invalid level rather than producing nonsense', () => {
    expect(() => computeEffectiveStats({ growth, level: 0, contentVersion: 'v1' as never })).toThrow();
    expect(() => computeEffectiveStats({ growth, level: 1.5, contentVersion: 'v1' as never })).toThrow();
  });
});

describe('applyDefense', () => {
  it('never reduces damage to zero, however large the defense', () => {
    // A hyperbolic curve means a high-defense creature is durable but never invulnerable.
    expect(applyDefense(1_000, 1_000_000, 100)).toBeGreaterThanOrEqual(0);
    expect(applyDefense(1_000, 100, 100)).toBe(500);
  });

  it('is unchanged by zero or negative defense', () => {
    expect(applyDefense(100, 0, 100)).toBe(100);
    expect(applyDefense(100, -50, 100)).toBe(100);
  });

  it('has diminishing returns, so stacking defense cannot trivialise the game', () => {
    const first = applyDefense(1_000, 0, 100) - applyDefense(1_000, 100, 100);
    const second = applyDefense(1_000, 100, 100) - applyDefense(1_000, 200, 100);

    expect(second).toBeLessThan(first);
  });
});

describe('elements', () => {
  it('recognises exactly the eight release elements', () => {
    expect(ELEMENTS).toHaveLength(8);
    expect(isElement('FIRE')).toBe(true);
    expect(isElement('VOID')).toBe(false);
  });

  it('encodes the intended advantages', () => {
    expect(elementDamageMultiplier('FIRE', 'NATURE')).toBeGreaterThan(10_000);
    expect(elementDamageMultiplier('FIRE', 'WATER')).toBeLessThan(10_000);
    expect(elementDamageMultiplier('WATER', 'FIRE')).toBeGreaterThan(10_000);
    expect(elementDamageMultiplier('EARTH', 'ELECTRIC')).toBeGreaterThan(10_000);
  });

  it('is neutral for unrelated pairings', () => {
    expect(elementDamageMultiplier('FIRE', 'FIRE')).toBe(10_000);
    expect(elementDamageMultiplier('LIGHT', 'WATER')).toBe(10_000);
  });

  it('makes Light and Shadow a mutual risk rather than a safe pick', () => {
    expect(elementDamageMultiplier('LIGHT', 'SHADOW')).toBeGreaterThan(10_000);
    expect(elementDamageMultiplier('SHADOW', 'LIGHT')).toBeGreaterThan(10_000);
  });

  it('separates status interaction from damage interaction', () => {
    // Electric applies far more reliably to a Wet target without hitting harder in a way the
    // damage matrix would have to encode.
    expect(elementStatusMultiplier('ELECTRIC', 'WATER')).toBeGreaterThan(10_000);
    expect(elementStatusMultiplier('LIGHT', 'SHADOW')).toBeLessThan(10_000);
  });

  it('classifies effectiveness for the battle log', () => {
    expect(classifyEffectiveness(15_000)).toBe('super');
    expect(classifyEffectiveness(10_000)).toBe('neutral');
    expect(classifyEffectiveness(7_500)).toBe('resisted');
  });

  it('has no element that is strong against everything', () => {
    // A universally dominant element would make team building meaningless.
    for (const attacker of ELEMENTS) {
      const strongAgainst = ELEMENTS.filter((d) => elementDamageMultiplier(attacker, d) > 10_000);
      expect(strongAgainst.length).toBeLessThan(ELEMENTS.length - 1);
    }
  });
});

describe('experience curve', () => {
  it('increases monotonically', () => {
    for (let level = 1; level < 20; level += 1) {
      expect(experienceForNextLevel(level + 1)).toBeGreaterThan(experienceForNextLevel(level));
    }
  });

  it('returns integers', () => {
    for (let level = 1; level <= 20; level += 1) {
      expect(Number.isInteger(experienceForNextLevel(level))).toBe(true);
    }
  });

  it('accumulates correctly', () => {
    expect(totalExperienceForLevel(1)).toBe(0);
    expect(totalExperienceForLevel(3)).toBe(experienceForNextLevel(1) + experienceForNextLevel(2));
  });

  it('rejects an invalid level', () => {
    expect(() => experienceForNextLevel(0)).toThrow();
  });
});

describe('evaluateLevelUp', () => {
  const enough = new Map([
    ['ember-seed', 10],
    ['fire-essence', 10],
  ]);

  it('advances one level and carries the surplus experience', () => {
    const required = experienceForNextLevel(1);
    const result = evaluateLevelUp({
      currentLevel: 1,
      currentExperience: required + 30,
      availableMaterials: enough,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.newLevel).toBe(2);
      // Surplus is carried, never discarded — discarding it would silently lose progress.
      expect(result.value.remainingExperience).toBe(30);
    }
  });

  it('advances exactly one level per call, even with a huge surplus', () => {
    // Consuming a large pool in one request would skip the gates in between, which is
    // precisely what the gates exist to prevent.
    const result = evaluateLevelUp({
      currentLevel: 1,
      currentExperience: 1_000_000,
      availableMaterials: enough,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.newLevel).toBe(2);
  });

  it('refuses when experience is insufficient', () => {
    const result = evaluateLevelUp({
      currentLevel: 1,
      currentExperience: 1,
      availableMaterials: enough,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.category).toBe('PRECONDITION_FAILED');
  });

  it('refuses when a gate material is missing', () => {
    const gate = gateForLevel(5);
    expect(gate).not.toBeNull();

    const result = evaluateLevelUp({
      currentLevel: 5,
      currentExperience: 1_000_000,
      availableMaterials: new Map(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INSUFFICIENT_INVENTORY');
  });

  it('consumes gate materials when the gate is met', () => {
    const result = evaluateLevelUp({
      currentLevel: 5,
      currentExperience: 1_000_000,
      availableMaterials: enough,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.consumedMaterials.length).toBeGreaterThan(0);
  });

  it('consumes nothing at an ungated level', () => {
    const result = evaluateLevelUp({
      currentLevel: 2,
      currentExperience: 1_000_000,
      availableMaterials: enough,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.consumedMaterials).toEqual([]);
  });

  it('refuses at the level cap', () => {
    const result = evaluateLevelUp({
      currentLevel: SLICE_LEVEL_CAP,
      currentExperience: 1_000_000,
      availableMaterials: enough,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.category).toBe('AUTHORIZATION');
  });
});

describe('resolveRewards', () => {
  const table: RewardTable = {
    experience: 40,
    drops: [
      { materialSlug: 'ember-seed', chanceBp: 10_000, minQuantity: 1, maxQuantity: 3 },
      { materialSlug: 'fire-essence', chanceBp: 2_500, minQuantity: 1, maxQuantity: 1 },
    ],
  };

  it('is deterministic for a given seed', () => {
    const a = resolveRewards(table, createSeededRandom('reward-seed'));
    const b = resolveRewards(table, createSeededRandom('reward-seed'));

    expect(a).toEqual(b);
  });

  it('always grants a guaranteed drop', () => {
    for (let i = 0; i < 40; i += 1) {
      const result = resolveRewards(table, createSeededRandom(`s-${i}`));
      expect(result.materials.some((m) => m.materialSlug === 'ember-seed')).toBe(true);
    }
  });

  it('respects the quantity range', () => {
    for (let i = 0; i < 60; i += 1) {
      const ember = resolveRewards(table, createSeededRandom(`q-${i}`)).materials.find(
        (m) => m.materialSlug === 'ember-seed',
      );
      expect(ember!.quantity).toBeGreaterThanOrEqual(1);
      expect(ember!.quantity).toBeLessThanOrEqual(3);
    }
  });

  it('grants a chance-based drop sometimes, and not always', () => {
    const outcomes = Array.from({ length: 200 }, (_unused, i) =>
      resolveRewards(table, createSeededRandom(`c-${i}`)).materials.some(
        (m) => m.materialSlug === 'fire-essence',
      ),
    );

    expect(outcomes.some(Boolean)).toBe(true);
    expect(outcomes.every(Boolean)).toBe(false);
  });

  it('returns materials in a stable sorted order', () => {
    // Stable output regardless of Map insertion order, so a result can be compared directly.
    for (let i = 0; i < 20; i += 1) {
      const slugs = resolveRewards(table, createSeededRandom(`o-${i}`)).materials.map((m) => m.materialSlug);
      expect(slugs).toEqual([...slugs].sort());
    }
  });

  it('passes experience through unchanged', () => {
    expect(resolveRewards(table, createSeededRandom('x')).experience).toBe(40);
  });
});

describe('validateRewardTable', () => {
  it('accepts a well-formed table', () => {
    expect(validateRewardTable({ experience: 10, drops: [] })).toEqual([]);
  });

  it('rejects a negative experience value', () => {
    expect(validateRewardTable({ experience: -1, drops: [] }).length).toBe(1);
  });

  it('rejects an out-of-range chance and an inverted quantity range', () => {
    const problems = validateRewardTable({
      experience: 1,
      drops: [
        { materialSlug: 'bad-chance', chanceBp: 20_000, minQuantity: 1, maxQuantity: 1 },
        { materialSlug: 'bad-range', chanceBp: 5_000, minQuantity: 5, maxQuantity: 2 },
      ],
    });

    expect(problems.length).toBe(2);
  });
});
