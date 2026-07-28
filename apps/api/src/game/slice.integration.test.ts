import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { loadSliceContent, schema, type DatabaseHandle } from '@collection-war/database';
import { createTestDatabase, type TestDatabaseHandle } from '@collection-war/database/testing';
import type { ApiConfig } from '@collection-war/configuration';
import { AuthService } from '../auth/auth.service';
import { ContentService } from './content.service';
import { CreaturesService } from './creatures.service';
import { InventoryService } from './inventory.service';
import { TeamsService } from './teams.service';
import { PveService } from './pve.service';
import { ProfileService } from './profile.service';
import { experienceForNextLevel } from '@collection-war/domain';

/**
 * THE FIRST PLAYABLE LOOP, end to end, against real PostgreSQL (PGlite — ADR-0025).
 *
 * These exercise the real services, the real SQL and the real migrations. They are the
 * evidence for CW-VS-001's acceptance criteria — not a proxy for them.
 *
 * NOT covered: concurrency. PGlite is single-connection, so two simultaneous starter grants
 * cannot be tested here. That remains gated on real PostgreSQL.
 */

let handle: TestDatabaseHandle;
let auth: AuthService;
let content: ContentService;
let creatures: CreaturesService;
let teams: TeamsService;
let pve: PveService;
let inventory: InventoryService;
let profile: ProfileService;

const config = {
  AUTH_JWT_SECRET: 'an-integration-test-secret-that-is-long-enough',
  AUTH_ACCESS_TOKEN_TTL: 900,
  AUTH_REFRESH_TOKEN_TTL: 2_592_000,
  COLLECTION_WAR_ENV: 'local',
  LOG_LEVEL: 'error',
} as unknown as ApiConfig;

/** A fresh idempotency key per intent, as a real client would generate. */
const key = () => randomUUID().replace(/-/g, '');

beforeAll(async () => {
  handle = await createTestDatabase();
  await loadSliceContent(handle.db);

  // The services take a DatabaseHandle; PGlite provides the same drizzle surface.
  const database = { db: handle.db, pool: {}, close: async () => undefined } as unknown as DatabaseHandle;

  auth = new AuthService(database, config);
  content = new ContentService(database);
  inventory = new InventoryService(database);
  creatures = new CreaturesService(database, content, inventory);
  teams = new TeamsService(database);
  pve = new PveService(database, content, inventory);
  profile = new ProfileService(database);
}, 60_000);

afterAll(async () => {
  await handle?.close();
});

async function registerPlayer(email: string) {
  const result = await auth.register(email, 'a-long-enough-password', 'Tester');
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('registration failed');
  return result.value;
}

// ══════════════════════════════════════════════════════════════════ identity

describe('registration and authentication', () => {
  it('creates an account, a profile and a session in one transaction', async () => {
    const session = await registerPlayer('first@example.com');

    expect(session.playerId).toBeTruthy();
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    const stored = await profile.get(session.playerId);
    expect(stored?.displayName).toBe('Tester');
    expect(stored?.hasStarter).toBe(false);
  });

  it('logs in with the correct password', async () => {
    await registerPlayer('login@example.com');
    const result = await auth.login('login@example.com', 'a-long-enough-password');

    expect(result.ok).toBe(true);
  });

  it('rejects a wrong password', async () => {
    await registerPlayer('wrong@example.com');
    const result = await auth.login('wrong@example.com', 'not-the-password');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns the SAME error shape for an unknown account as for a wrong password', async () => {
    // No user enumeration: the endpoint must not be usable as an oracle for which addresses
    // have accounts.
    const unknown = await auth.login('nobody@example.com', 'a-long-enough-password');
    await registerPlayer('known@example.com');
    const wrong = await auth.login('known@example.com', 'wrong-password-here');

    expect(unknown.ok).toBe(false);
    expect(wrong.ok).toBe(false);
    if (!unknown.ok && !wrong.ok) {
      expect(unknown.error.code).toBe(wrong.error.code);
      expect(unknown.error.message).toBe(wrong.error.message);
    }
  });

  it('does not reveal that an email is taken', async () => {
    await registerPlayer('dupe@example.com');
    const again = await auth.register('dupe@example.com', 'a-long-enough-password', 'Other');

    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.error.message).not.toMatch(/taken|exists|registered/i);
    }
  });

  it('is case-insensitive about email', async () => {
    await registerPlayer('Case@Example.com');
    const login = await auth.login('case@example.COM', 'a-long-enough-password');

    expect(login.ok).toBe(true);
  });

  it('rotates the refresh token', async () => {
    const session = await registerPlayer('rotate@example.com');
    const refreshed = await auth.refresh(session.refreshToken);

    expect(refreshed.ok).toBe(true);
    if (refreshed.ok) expect(refreshed.value.refreshToken).not.toBe(session.refreshToken);
  });

  it('REVOKES THE WHOLE FAMILY when a refresh token is reused', async () => {
    // The property that turns token theft from silent persistent access into a detectable
    // event: the legitimate client and the attacker cannot both hold a valid token.
    const session = await registerPlayer('reuse@example.com');

    const first = await auth.refresh(session.refreshToken);
    expect(first.ok).toBe(true);

    // The attacker replays the original.
    const replay = await auth.refresh(session.refreshToken);
    expect(replay.ok).toBe(false);

    // And the legitimate client's newly-issued token is now dead too.
    if (first.ok) {
      const afterRevocation = await auth.refresh(first.value.refreshToken);
      expect(afterRevocation.ok).toBe(false);
    }
  });

  it('rejects a refresh token that was never issued', async () => {
    expect((await auth.refresh('not-a-real-token')).ok).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════ starters

describe('starter selection', () => {
  it('offers exactly three starters', async () => {
    const version = await content.currentVersion();
    const starters = await content.starters(version);

    expect(starters).toHaveLength(3);
    expect(starters.map((s) => s.slug).sort()).toEqual(['koruk', 'mizu', 'veyra']);
  });

  it('grants the chosen starter', async () => {
    const session = await registerPlayer('starter@example.com');
    const result = await creatures.grantStarter(session.playerId, 'koruk', key());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.speciesSlug).toBe('koruk');
      expect(result.value.level).toBe(1);
      // Stats are DERIVED from the growth curve, never stored.
      expect(result.value.stats.health).toBeGreaterThan(0);
    }
  });

  it('returns the ORIGINAL creature when the same request is retried', async () => {
    // A mobile client on a poor connection retries. It must not receive a second creature.
    const session = await registerPlayer('retry@example.com');
    const idempotencyKey = key();

    const first = await creatures.grantStarter(session.playerId, 'mizu', idempotencyKey);
    const retry = await creatures.grantStarter(session.playerId, 'mizu', idempotencyKey);

    expect(first.ok && retry.ok).toBe(true);
    if (first.ok && retry.ok) expect(retry.value.id).toBe(first.value.id);

    expect(await creatures.listForPlayer(session.playerId)).toHaveLength(1);
  });

  it('REFUSES a second starter, even with a different idempotency key', async () => {
    // The double-tap case: two distinct intents. The idempotency key does not help here —
    // `starter_granted_at` does.
    const session = await registerPlayer('double@example.com');

    const first = await creatures.grantStarter(session.playerId, 'koruk', key());
    const second = await creatures.grantStarter(session.playerId, 'veyra', key());

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.category).toBe('CONFLICT');

    expect(await creatures.listForPlayer(session.playerId)).toHaveLength(1);
  });

  it('rejects a species that is not a starter', async () => {
    const session = await registerPlayer('notstarter@example.com');
    const result = await creatures.grantStarter(session.playerId, 'cinder-sprout', key());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.category).toBe('NOT_FOUND');
  });

  it('writes an append-only history row', async () => {
    const session = await registerPlayer('history@example.com');
    const granted = await creatures.grantStarter(session.playerId, 'koruk', key());

    expect(granted.ok).toBe(true);
    if (!granted.ok) return;

    const history = await handle.db
      .select()
      .from(schema.creatureHistory)
      .where(eq(schema.creatureHistory.creatureId, granted.value.id));

    expect(history).toHaveLength(1);
    expect(history[0]?.eventType).toBe('acquired');
  });

  it('emits OwnedCreatures.Acquired to the outbox', async () => {
    const session = await registerPlayer('event@example.com');
    await creatures.grantStarter(session.playerId, 'koruk', key());

    const events = await handle.db
      .select()
      .from(schema.outbox)
      .where(eq(schema.outbox.eventName, 'OwnedCreatures.Acquired'));

    expect(events.length).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════ teams

describe('teams', () => {
  it('accepts a team of owned creatures', async () => {
    const session = await registerPlayer('team@example.com');
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');

    const result = await teams.setActiveTeam(session.playerId, 'Main', [
      { slot: 0, creatureId: starter.value.id },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.members).toHaveLength(1);
  });

  it("REJECTS another player's creature with 404, not 403", async () => {
    // 403 would confirm the creature exists, which is enumeration.
    const owner = await registerPlayer('owner@example.com');
    const attacker = await registerPlayer('attacker@example.com');

    const victimCreature = await creatures.grantStarter(owner.playerId, 'koruk', key());
    if (!victimCreature.ok) throw new Error('setup failed');

    const result = await teams.setActiveTeam(attacker.playerId, 'Stolen', [
      { slot: 0, creatureId: victimCreature.value.id },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.category).toBe('NOT_FOUND');
  });

  it('rejects the same creature in two slots', async () => {
    const session = await registerPlayer('dupeslot@example.com');
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');

    const result = await teams.setActiveTeam(session.playerId, 'Main', [
      { slot: 0, creatureId: starter.value.id },
      { slot: 1, creatureId: starter.value.id },
    ]);

    expect(result.ok).toBe(false);
  });

  it('rejects an out-of-range slot', async () => {
    const session = await registerPlayer('badslot@example.com');
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');

    const result = await teams.setActiveTeam(session.playerId, 'Main', [
      { slot: 99, creatureId: starter.value.id },
    ]);

    expect(result.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════ the loop

describe('the full playable loop', () => {
  it('registers → starter → team → battle → rewards → level-up', async () => {
    // The acceptance criterion for CW-VS-001, in one test.
    const session = await registerPlayer('loop@example.com');

    // Starter
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    expect(starter.ok).toBe(true);
    if (!starter.ok) return;

    // Team
    const team = await teams.setActiveTeam(session.playerId, 'Main', [
      { slot: 0, creatureId: starter.value.id },
    ]);
    expect(team.ok).toBe(true);

    // The first node must be unlocked and the rest gated.
    const nodes = await pve.listNodes(session.playerId);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[0]?.unlocked).toBe(true);
    expect(nodes[1]?.unlocked).toBe(false);

    // Battle
    const battle = await pve.fight(session.playerId, nodes[0]!.id, key());
    expect(battle.ok).toBe(true);
    if (!battle.ok) return;

    expect(battle.value.outcome).toBe('SIDE_A');
    expect(battle.value.seed).toBeTruthy();
    expect(battle.value.engineVersion).toBe('1.0.0');
    expect(battle.value.events.length).toBeGreaterThan(0);
    expect(battle.value.rewards.experience).toBeGreaterThan(0);
    expect(battle.value.rewards.materials.length).toBeGreaterThan(0);

    // Rewards landed in the inventory
    const materials = await inventory.listForPlayer(session.playerId);
    expect(materials.length).toBeGreaterThan(0);
    expect(materials.some((m) => m.materialSlug === 'ember-seed')).toBe(true);

    // Experience landed on the creature
    const afterBattle = await creatures.getById(session.playerId, starter.value.id);
    expect(afterBattle?.experience).toBeGreaterThan(0);

    // The next node is now unlocked
    const afterNodes = await pve.listNodes(session.playerId);
    expect(afterNodes[0]?.cleared).toBe(true);
    expect(afterNodes[1]?.unlocked).toBe(true);

    // Level up
    expect(afterBattle!.experience).toBeGreaterThanOrEqual(experienceForNextLevel(1));
    const levelled = await creatures.levelUp(session.playerId, starter.value.id, key());

    expect(levelled.ok).toBe(true);
    if (levelled.ok) {
      expect(levelled.value.level).toBe(2);
      // Stats are derived, so levelling must visibly change them.
      expect(levelled.value.stats.health).toBeGreaterThan(afterBattle!.stats.health);
    }
  });

  it('does NOT grant rewards twice when a battle is retried', async () => {
    // The most likely duplication bug in the whole slice.
    const session = await registerPlayer('replay@example.com');
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');
    await teams.setActiveTeam(session.playerId, 'Main', [{ slot: 0, creatureId: starter.value.id }]);

    const nodes = await pve.listNodes(session.playerId);
    const idempotencyKey = key();

    const first = await pve.fight(session.playerId, nodes[0]!.id, idempotencyKey);
    const materialsAfterFirst = await inventory.listForPlayer(session.playerId);
    const totalAfterFirst = materialsAfterFirst.reduce((sum, m) => sum + m.quantity, 0);

    const retry = await pve.fight(session.playerId, nodes[0]!.id, idempotencyKey);
    const materialsAfterRetry = await inventory.listForPlayer(session.playerId);
    const totalAfterRetry = materialsAfterRetry.reduce((sum, m) => sum + m.quantity, 0);

    expect(first.ok && retry.ok).toBe(true);
    if (first.ok && retry.ok) {
      // The retry returns the ORIGINAL battle, not a new one.
      expect(retry.value.battleId).toBe(first.value.battleId);
    }
    expect(totalAfterRetry).toBe(totalAfterFirst);
  });

  it('refuses to fight a locked node', async () => {
    const session = await registerPlayer('locked@example.com');
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');
    await teams.setActiveTeam(session.playerId, 'Main', [{ slot: 0, creatureId: starter.value.id }]);

    const nodes = await pve.listNodes(session.playerId);
    const result = await pve.fight(session.playerId, nodes[1]!.id, key());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.category).toBe('AUTHORIZATION');
  });

  it('refuses to fight without a team', async () => {
    const session = await registerPlayer('noteam@example.com');
    const nodes = await pve.listNodes(session.playerId);

    const result = await pve.fight(session.playerId, nodes[0]!.id, key());
    expect(result.ok).toBe(false);
  });

  it('stores the battle so it can be replayed', async () => {
    const session = await registerPlayer('stored@example.com');
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');
    await teams.setActiveTeam(session.playerId, 'Main', [{ slot: 0, creatureId: starter.value.id }]);

    const nodes = await pve.listNodes(session.playerId);
    const battle = await pve.fight(session.playerId, nodes[0]!.id, key());
    if (!battle.ok) throw new Error('battle failed');

    const fetched = await pve.getBattle(session.playerId, battle.value.battleId);
    expect(fetched.ok).toBe(true);
    if (fetched.ok) {
      expect(fetched.value.seed).toBe(battle.value.seed);
      expect(fetched.value.events.length).toBe(battle.value.events.length);
    }
  });

  it("returns 404 for another player's battle", async () => {
    const owner = await registerPlayer('battleowner@example.com');
    const other = await registerPlayer('battleother@example.com');

    const starter = await creatures.grantStarter(owner.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');
    await teams.setActiveTeam(owner.playerId, 'Main', [{ slot: 0, creatureId: starter.value.id }]);

    const nodes = await pve.listNodes(owner.playerId);
    const battle = await pve.fight(owner.playerId, nodes[0]!.id, key());
    if (!battle.ok) throw new Error('battle failed');

    const stolen = await pve.getBattle(other.playerId, battle.value.battleId);
    expect(stolen.ok).toBe(false);
    if (!stolen.ok) expect(stolen.error.category).toBe('NOT_FOUND');
  });
});

// ═══════════════════════════════════════════════════════════════ level-up

describe('level-up', () => {
  it('rejects a level-up without enough experience', async () => {
    const session = await registerPlayer('noexp@example.com');
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');

    const result = await creatures.levelUp(session.playerId, starter.value.id, key());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.category).toBe('PRECONDITION_FAILED');
  });

  it("returns 404 for another player's creature", async () => {
    const owner = await registerPlayer('lvlowner@example.com');
    const attacker = await registerPlayer('lvlattacker@example.com');

    const starter = await creatures.grantStarter(owner.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');

    const result = await creatures.levelUp(attacker.playerId, starter.value.id, key());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.category).toBe('NOT_FOUND');
  });

  it('does not level twice when retried with the same key', async () => {
    const session = await registerPlayer('lvlretry@example.com');
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');
    await teams.setActiveTeam(session.playerId, 'Main', [{ slot: 0, creatureId: starter.value.id }]);

    const nodes = await pve.listNodes(session.playerId);
    await pve.fight(session.playerId, nodes[0]!.id, key());

    const idempotencyKey = key();
    await creatures.levelUp(session.playerId, starter.value.id, idempotencyKey);
    await creatures.levelUp(session.playerId, starter.value.id, idempotencyKey);

    const after = await creatures.getById(session.playerId, starter.value.id);
    expect(after?.level).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════ cross-client

describe('cross-client state', () => {
  it('returns identical state to a second client authenticating as the same player', async () => {
    // The actual cross-platform requirement: play on the web, continue on the phone.
    const session = await registerPlayer('crossclient@example.com');

    await profile.setLocale(session.playerId, 'en');
    const starter = await creatures.grantStarter(session.playerId, 'veyra', key());
    if (!starter.ok) throw new Error('setup failed');
    await teams.setActiveTeam(session.playerId, 'Main', [{ slot: 0, creatureId: starter.value.id }]);

    const nodes = await pve.listNodes(session.playerId);
    await pve.fight(session.playerId, nodes[0]!.id, key());

    // "Client B" — a completely separate login, as a phone would do.
    const secondClient = await auth.login('crossclient@example.com', 'a-long-enough-password');
    expect(secondClient.ok).toBe(true);
    if (!secondClient.ok) return;

    expect(secondClient.value.playerId).toBe(session.playerId);
    expect(secondClient.value.locale).toBe('en');

    const creaturesOnB = await creatures.listForPlayer(secondClient.value.playerId);
    const inventoryOnB = await inventory.listForPlayer(secondClient.value.playerId);
    const teamOnB = await teams.getActive(secondClient.value.playerId);

    expect(creaturesOnB).toHaveLength(1);
    expect(creaturesOnB[0]?.id).toBe(starter.value.id);
    expect(creaturesOnB[0]?.experience).toBeGreaterThan(0);
    expect(inventoryOnB.length).toBeGreaterThan(0);
    expect(teamOnB?.members[0]?.creatureId).toBe(starter.value.id);
  });

  it('persists the locale server-side, not per device', async () => {
    const session = await registerPlayer('locale@example.com');
    expect((await profile.get(session.playerId))?.locale).toBe('tr-TR');

    await profile.setLocale(session.playerId, 'en');

    const relogin = await auth.login('locale@example.com', 'a-long-enough-password');
    expect(relogin.ok).toBe(true);
    if (relogin.ok) expect(relogin.value.locale).toBe('en');
  });
});

// ══════════════════════════════════════════════════════════════ determinism

describe('battle determinism in situ', () => {
  it('stores the seed and versions needed to replay', async () => {
    const session = await registerPlayer('determinism@example.com');
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');
    await teams.setActiveTeam(session.playerId, 'Main', [{ slot: 0, creatureId: starter.value.id }]);

    const nodes = await pve.listNodes(session.playerId);
    const battle = await pve.fight(session.playerId, nodes[0]!.id, key());
    if (!battle.ok) throw new Error('battle failed');

    const stored = await handle.db
      .select()
      .from(schema.battleSessions)
      .where(eq(schema.battleSessions.id, battle.value.battleId));

    expect(stored[0]?.seed).toBe(battle.value.seed);
    expect(stored[0]?.engineVersion).toBe('1.0.0');
    expect(stored[0]?.contentVersion).toBe('2026.07.28-1');
  });

  it('generates a different seed for every battle', async () => {
    const session = await registerPlayer('seeds@example.com');
    const starter = await creatures.grantStarter(session.playerId, 'koruk', key());
    if (!starter.ok) throw new Error('setup failed');
    await teams.setActiveTeam(session.playerId, 'Main', [{ slot: 0, creatureId: starter.value.id }]);

    const nodes = await pve.listNodes(session.playerId);
    const seeds = new Set<string>();

    for (let i = 0; i < 5; i += 1) {
      const battle = await pve.fight(session.playerId, nodes[0]!.id, key());
      if (battle.ok) seeds.add(battle.value.seed);
    }

    expect(seeds.size).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════ content

describe('content', () => {
  it('is idempotent to load', async () => {
    const again = await loadSliceContent(handle.db);
    expect(again.loaded).toBe(false);
  });

  it('uses localization keys, never display text, as identifiers', async () => {
    const version = await content.currentVersion();
    for (const species of await content.allSpecies(version)) {
      expect(species.nameKey).toMatch(/^species\.[a-z-]+\.name$/);
      expect(species.slug).toMatch(/^[a-z-]+$/);
    }
  });
});
