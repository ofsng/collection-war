import { describe, expect, it } from 'vitest';
import type { Element, Stats } from '@collection-war/domain';
import { createBattleEngine } from './engine';
import { CURRENT_RULESET, RULESET_1_0_0, rulesetForVersion } from './ruleset';
import { BATTLE_ENGINE_INVARIANTS } from './contract';
import { BATTLE_ENGINE_VERSION, canReplay } from './version';
import type { BattleCreature, BattleInput } from './types';

const engine = createBattleEngine();

function stats(overrides: Partial<Stats> = {}): Stats {
  return {
    health: 200,
    attack: 60,
    defense: 40,
    focus: 50,
    speed: 50,
    resistance: 20,
    critRate: 500,
    critPower: 15_000,
    affinity: 100,
    ...overrides,
  };
}

function creature(id: string, element: Element, overrides: Partial<BattleCreature> = {}): BattleCreature {
  return {
    instanceId: id as never,
    speciesSlug: `species-${id}`,
    nameKey: `species.${id}.name`,
    element,
    level: 5,
    stats: stats(),
    abilities: [
      {
        slug: 'strike',
        nameKey: 'a.strike',
        kind: 'PHYSICAL',
        powerBp: 8_000,
        energyCost: 0,
        burnChanceBp: 0,
      },
      {
        slug: 'blast',
        nameKey: 'a.blast',
        kind: 'SPECIAL',
        powerBp: 16_000,
        energyCost: 25,
        burnChanceBp: 3_000,
      },
    ],
    ...overrides,
  };
}

function input(overrides: Partial<BattleInput> = {}): BattleInput {
  return {
    battleId: 'battle-1' as never,
    seed: 'seed-alpha',
    contentVersion: '2026.07.28-1' as never,
    startedAt: '2026-07-28T10:00:00.000Z' as never,
    participants: [
      { playerId: 'player-1' as never, side: 'A', creatures: [creature('a1', 'FIRE')] },
      { playerId: null, side: 'B', creatures: [creature('b1', 'NATURE')] },
    ],
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────── determinism

describe('determinism', () => {
  it('produces an identical result for an identical seed', () => {
    // The property the entire audit, replay and anti-cheat story rests on. If this ever
    // fails, recorded battle outcomes stop being reproducible and every dispute becomes
    // unanswerable.
    const a = engine.resolve(input());
    const b = engine.resolve(input());

    expect(a).toEqual(b);
  });

  it('produces a different result for a different seed', () => {
    const a = engine.resolve(input({ seed: 'seed-alpha' }));
    const b = engine.resolve(input({ seed: 'seed-beta' }));

    // Same combatants, different seed — the event logs must differ somewhere.
    expect(JSON.stringify(a.events)).not.toBe(JSON.stringify(b.events));
  });

  it('never mutates its input', () => {
    const original = input();
    const snapshot = structuredClone(original);

    engine.resolve(original);

    expect(original).toEqual(snapshot);
  });

  it('is stable across 20 consecutive resolutions', () => {
    const first = JSON.stringify(engine.resolve(input()));

    for (let i = 0; i < 20; i += 1) {
      expect(JSON.stringify(engine.resolve(input()))).toBe(first);
    }
  });
});

// ────────────────────────────────────────────────────────────────── termination

describe('termination', () => {
  it('always terminates, even between two immovable objects', () => {
    // Two creatures with enormous health and negligible damage. Without the turn cap this
    // would be an infinite loop — a hung request and a permanently stuck player.
    const wall = (id: string) =>
      creature(id, 'EARTH', {
        stats: stats({ health: 1_000_000, attack: 1, focus: 1, defense: 10_000 }),
        abilities: [
          { slug: 'poke', nameKey: 'a.poke', kind: 'PHYSICAL', powerBp: 1, energyCost: 0, burnChanceBp: 0 },
        ],
      });

    const result = engine.resolve(
      input({
        participants: [
          { playerId: 'p' as never, side: 'A', creatures: [wall('a')] },
          { playerId: null, side: 'B', creatures: [wall('b')] },
        ],
      }),
    );

    expect(result.turnCount).toBeLessThanOrEqual(CURRENT_RULESET.maxTurns);
    expect(result.outcome).toBe('DRAW');
  });

  it('terminates for 200 random seeds', () => {
    for (let i = 0; i < 200; i += 1) {
      const result = engine.resolve(input({ seed: `seed-${i}` }));

      expect(result.turnCount).toBeGreaterThan(0);
      expect(result.turnCount).toBeLessThanOrEqual(CURRENT_RULESET.maxTurns);
      expect(['SIDE_A', 'SIDE_B', 'DRAW']).toContain(result.outcome);
    }
  });
});

// ──────────────────────────────────────────────────────────── state invariants

describe('state invariants', () => {
  it('never reports negative health', () => {
    for (let i = 0; i < 50; i += 1) {
      for (const state of engine.resolve(input({ seed: `s-${i}` })).finalState) {
        expect(state.remainingHealth).toBeGreaterThanOrEqual(0);
        expect(state.remainingHealth).toBeLessThanOrEqual(state.maxHealth);
      }
    }
  });

  it('always deals at least the minimum damage, even against enormous defense', () => {
    const result = engine.resolve(
      input({
        participants: [
          { playerId: 'p' as never, side: 'A', creatures: [creature('a', 'FIRE')] },
          {
            playerId: null,
            side: 'B',
            creatures: [creature('b', 'WATER', { stats: stats({ defense: 100_000 }) })],
          },
        ],
      }),
    );

    const damageEvents = result.events.filter((e) => e.type === 'damage_dealt');
    expect(damageEvents.length).toBeGreaterThan(0);
    for (const event of damageEvents) {
      expect(event.data.amount as number).toBeGreaterThanOrEqual(CURRENT_RULESET.minimumDamage);
    }
  });

  it('emits a strictly increasing event sequence', () => {
    const { events } = engine.resolve(input());

    for (let i = 1; i < events.length; i += 1) {
      expect(events[i]!.sequence).toBe(events[i - 1]!.sequence + 1);
    }
  });

  it('opens with battle_started and closes with battle_ended', () => {
    const { events } = engine.resolve(input());

    expect(events[0]?.type).toBe('battle_started');
    expect(events[events.length - 1]?.type).toBe('battle_ended');
  });
});

// ──────────────────────────────────────────────────────────────────── mechanics

describe('mechanics', () => {
  it('lets the faster creature act first', () => {
    const result = engine.resolve(
      input({
        participants: [
          {
            playerId: 'p' as never,
            side: 'A',
            creatures: [creature('slow', 'FIRE', { stats: stats({ speed: 10 }) })],
          },
          {
            playerId: null,
            side: 'B',
            creatures: [creature('fast', 'WATER', { stats: stats({ speed: 99 }) })],
          },
        ],
      }),
    );

    const firstTurn = result.events.find((e) => e.type === 'turn_started');
    expect(firstTurn?.data.actor).toBe('fast');
  });

  it('breaks a speed tie deterministically in favour of side A', () => {
    // `sort` is not required to be stable across engines, so the tiebreak must be explicit —
    // otherwise the same battle could resolve differently on two machines.
    const result = engine.resolve(input());
    const firstTurn = result.events.find((e) => e.type === 'turn_started');

    expect(firstTurn?.data.actor).toBe('a1');
  });

  it('applies element effectiveness — Fire is strong against Nature', () => {
    const result = engine.resolve(input());
    const hit = result.events.find((e) => e.type === 'damage_dealt' && e.data.actor === 'a1');

    expect(hit?.data.effectiveness).toBe('super');
  });

  it('applies element resistance — Fire is weak against Water', () => {
    const result = engine.resolve(
      input({
        participants: [
          { playerId: 'p' as never, side: 'A', creatures: [creature('a1', 'FIRE')] },
          { playerId: null, side: 'B', creatures: [creature('b1', 'WATER')] },
        ],
      }),
    );

    const hit = result.events.find((e) => e.type === 'damage_dealt' && e.data.actor === 'a1');
    expect(hit?.data.effectiveness).toBe('resisted');
  });

  it('spends energy on an ability and cannot spend below zero', () => {
    const result = engine.resolve(input());
    const abilityUses = result.events.filter((e) => e.type === 'ability_used');

    expect(abilityUses.length).toBeGreaterThan(0);
    for (const use of abilityUses) {
      expect(use.data.energyRemaining as number).toBeGreaterThanOrEqual(0);
    }
  });

  it('falls back to a basic attack when energy is insufficient', () => {
    const expensive = creature('a', 'FIRE', {
      abilities: [
        { slug: 'jab', nameKey: 'a.jab', kind: 'PHYSICAL', powerBp: 5_000, energyCost: 0, burnChanceBp: 0 },
        {
          slug: 'nova',
          nameKey: 'a.nova',
          kind: 'SPECIAL',
          powerBp: 40_000,
          energyCost: 999,
          burnChanceBp: 0,
        },
      ],
    });

    const result = engine.resolve(
      input({
        participants: [
          { playerId: 'p' as never, side: 'A', creatures: [expensive] },
          { playerId: null, side: 'B', creatures: [creature('b', 'NATURE')] },
        ],
      }),
    );

    expect(result.events.some((e) => e.type === 'basic_attack')).toBe(true);
    expect(result.events.some((e) => e.type === 'ability_used' && e.data.ability === 'nova')).toBe(false);
  });

  it('applies and ticks Burn, and the tick is recorded', () => {
    // A high burn chance against a low-resistance target, so the path is exercised reliably.
    const burner = creature('a', 'FIRE', {
      abilities: [
        { slug: 'jab', nameKey: 'a.jab', kind: 'PHYSICAL', powerBp: 100, energyCost: 0, burnChanceBp: 0 },
        {
          slug: 'ignite',
          nameKey: 'a.ignite',
          kind: 'SPECIAL',
          powerBp: 100,
          energyCost: 5,
          burnChanceBp: 10_000,
        },
      ],
    });
    const tough = creature('b', 'NATURE', {
      stats: stats({ health: 5_000, resistance: 0, attack: 1, focus: 1 }),
      abilities: [
        { slug: 'tap', nameKey: 'a.tap', kind: 'PHYSICAL', powerBp: 1, energyCost: 0, burnChanceBp: 0 },
      ],
    });

    const result = engine.resolve(
      input({
        participants: [
          { playerId: 'p' as never, side: 'A', creatures: [burner] },
          { playerId: null, side: 'B', creatures: [tough] },
        ],
      }),
    );

    expect(result.events.some((e) => e.type === 'status_applied' && e.data.status === 'BURN')).toBe(true);
    expect(result.events.some((e) => e.type === 'status_ticked' && e.data.status === 'BURN')).toBe(true);
  });

  it('records a defeat and ends the battle', () => {
    const glass = creature('b', 'NATURE', { stats: stats({ health: 1, defense: 0 }) });

    const result = engine.resolve(
      input({
        participants: [
          { playerId: 'p' as never, side: 'A', creatures: [creature('a', 'FIRE')] },
          { playerId: null, side: 'B', creatures: [glass] },
        ],
      }),
    );

    expect(result.events.some((e) => e.type === 'creature_defeated' && e.data.creature === 'b')).toBe(true);
    expect(result.outcome).toBe('SIDE_A');
  });

  it('supports three creatures a side', () => {
    // The slice uses one, but the release targets 3v3 — the engine must not assume otherwise.
    const result = engine.resolve(
      input({
        participants: [
          {
            playerId: 'p' as never,
            side: 'A',
            creatures: [creature('a1', 'FIRE'), creature('a2', 'WATER'), creature('a3', 'AIR')],
          },
          {
            playerId: null,
            side: 'B',
            creatures: [creature('b1', 'NATURE'), creature('b2', 'EARTH'), creature('b3', 'ELECTRIC')],
          },
        ],
      }),
    );

    expect(result.finalState).toHaveLength(6);
    expect(result.turnCount).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────────── versioning

describe('versioning', () => {
  it('stamps the engine and content versions onto the result', () => {
    const result = engine.resolve(input());

    expect(result.engineVersion).toBe('1.0.0');
    expect(result.contentVersion).toBe('2026.07.28-1');
    expect(result.seed).toBe('seed-alpha');
  });

  it('reports replayability from the ruleset register, not optimistically', () => {
    expect(canReplay(BATTLE_ENGINE_VERSION)).toBe(true);
    expect(canReplay('9.9.9' as never)).toBe(false);
    expect(rulesetForVersion('1.0.0' as never)).toBe(RULESET_1_0_0);
    expect(rulesetForVersion('0.0.1' as never)).toBeNull();
  });
});

describe('declared invariants', () => {
  it('states determinism first', () => {
    expect(BATTLE_ENGINE_INVARIANTS[0]).toMatch(/[Ii]dentical input and seed/);
  });

  it('forbids I/O during resolution', () => {
    expect(BATTLE_ENGINE_INVARIANTS.join(' ')).toMatch(/no network, no filesystem, no database/);
  });
});
