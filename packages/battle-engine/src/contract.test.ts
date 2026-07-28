import { describe, expect, it } from 'vitest';
import { BATTLE_ENGINE_INVARIANTS } from './contract';
import { BATTLE_ENGINE_VERSION, canReplay } from './version';

/**
 * There is no battle logic to test yet — by design. These tests protect the CONTRACT, so
 * that the first real implementation cannot quietly drop the guarantees the rest of the
 * architecture assumes.
 */

describe('battle engine contract', () => {
  it('declares its invariants explicitly', () => {
    expect(BATTLE_ENGINE_INVARIANTS.length).toBeGreaterThan(0);
  });

  it('states determinism as the first invariant', () => {
    // Ordering is meaningful here: everything else in the audit, anti-cheat and replay
    // story depends on this one holding.
    expect(BATTLE_ENGINE_INVARIANTS[0]).toMatch(/[Ii]dentical input and seed/);
  });

  it('forbids I/O during resolution', () => {
    expect(BATTLE_ENGINE_INVARIANTS.join(' ')).toMatch(/no network, no filesystem, no database/);
  });
});

describe('engine versioning', () => {
  it('exposes a version to stamp onto results', () => {
    expect(BATTLE_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('reports honestly that no historical version is replayable yet', () => {
    // Answering `true` here would be a lie that hides a real limitation.
    expect(canReplay(BATTLE_ENGINE_VERSION)).toBe(true);
    expect(canReplay('0.0.1' as never)).toBe(false);
  });
});

describe('bootstrap scope', () => {
  it('exports no gameplay implementation', async () => {
    // Guards the explicit "no gameplay during bootstrap" constraint. If someone adds a
    // damage formula or a creature roster here, this test tells them the specification
    // phase has not happened yet.
    const engineModule = await import('./index');
    const exported = Object.keys(engineModule);

    const gameplaySurface = exported.filter((name) =>
      /damage|attack|ability|creature|species|stat|element|skill|resolve/i.test(name),
    );

    expect(
      gameplaySurface,
      `Gameplay symbols exported before the battle specification is approved: ${gameplaySurface.join(', ')}`,
    ).toEqual([]);
  });
});
