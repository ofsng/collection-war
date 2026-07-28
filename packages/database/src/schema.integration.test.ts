import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDatabase, testId, type TestDatabaseHandle } from './testing';
import { creatureSpecies, materialDefinitions } from './schema/catalog';
import { users } from './schema/identity';
import { playerProfiles } from './schema/player';
import { ownedCreatures, teamMembers, teams } from './schema/creatures';
import { materialInventory } from './schema/gameplay';
import { idempotencyKeys } from './schema/idempotency';

/**
 * Schema integrity, against REAL PostgreSQL (via PGlite — see ADR-0025).
 *
 * These test the properties the whole design rests on and which no unit test can prove: that
 * the constraints are actually in the database and actually enforced.
 *
 * NOT covered here — PGlite is single-connection: concurrent double-spend, serialization
 * failures, the retry path. Those remain gated on real PostgreSQL.
 */

let handle: TestDatabaseHandle;

const CONTENT_VERSION = '2026.07.28-1';

beforeAll(async () => {
  handle = await createTestDatabase();

  // Minimal fixtures. Ids are deterministic so a failure names something followable.
  await handle.db.insert(users).values({
    id: testId(1),
    email: 'player@example.com',
    passwordHash: 'scrypt$16384$8$1$c2FsdA$aGFzaA',
  });

  await handle.db.insert(playerProfiles).values({
    id: testId(2),
    userId: testId(1),
    displayName: 'Tester',
  });

  await handle.db.insert(creatureSpecies).values({
    id: testId(3),
    slug: 'koruk',
    contentVersion: CONTENT_VERSION,
    nameKey: 'species.koruk.name',
    descriptionKey: 'species.koruk.description',
    element: 'FIRE',
    class: 'GUARDIAN',
    rarity: 'COMMON',
    growth: { base: {}, perLevel: {} },
    artKey: 'koruk',
  });

  await handle.db.insert(materialDefinitions).values({
    id: testId(4),
    slug: 'ember-seed',
    contentVersion: CONTENT_VERSION,
    nameKey: 'material.ember-seed.name',
    descriptionKey: 'material.ember-seed.description',
    category: 'BOTANICAL',
    rarity: 'RAW',
    iconKey: 'ember-seed',
  });
});

afterAll(async () => {
  await handle?.close();
});

describe('it really is PostgreSQL', () => {
  it('reports a PostgreSQL version', async () => {
    const result = await handle.db.execute<{ version: string }>(sql`SELECT version()`);

    expect(result.rows[0]?.version).toContain('PostgreSQL');
  });
});

describe('inventory quantity constraint', () => {
  it('accepts a non-negative quantity', async () => {
    await handle.db.insert(materialInventory).values({
      id: testId(10),
      playerId: testId(2),
      materialId: testId(4),
      quantity: 5,
    });

    const rows = await handle.db.select().from(materialInventory);
    expect(rows).toHaveLength(1);
  });

  it('REJECTS a negative quantity at the database level', async () => {
    // The single most important constraint in the inventory system. Application code also
    // checks, but a CHECK constraint cannot be forgotten by a new code path.
    await expect(
      handle.db
        .update(materialInventory)
        .set({ quantity: -1 })
        .where(sql`${materialInventory.id} = ${testId(10)}`),
    ).rejects.toThrow();
  });

  it('rejects a negative quantity on insert too', async () => {
    await expect(
      handle.db.insert(materialInventory).values({
        id: testId(11),
        playerId: testId(2),
        materialId: testId(4),
        quantity: -5,
      }),
    ).rejects.toThrow();
  });

  it('permits exactly zero — an emptied stack is legal, a negative one is not', async () => {
    await expect(
      handle.db
        .update(materialInventory)
        .set({ quantity: 0 })
        .where(sql`${materialInventory.id} = ${testId(10)}`),
    ).resolves.not.toThrow();

    // Restore, so later tests see a stocked inventory.
    await handle.db
      .update(materialInventory)
      .set({ quantity: 5 })
      .where(sql`${materialInventory.id} = ${testId(10)}`);
  });

  it('rejects two stacks of the same material for one player', async () => {
    await expect(
      handle.db.insert(materialInventory).values({
        id: testId(13),
        playerId: testId(2),
        materialId: testId(4),
        quantity: 1,
      }),
    ).rejects.toThrow();
  });
});

describe('uniqueness constraints', () => {
  it('rejects a duplicate email — this is what makes registration safe under concurrency', async () => {
    await expect(
      handle.db.insert(users).values({
        id: testId(20),
        email: 'player@example.com',
        passwordHash: 'x',
      }),
    ).rejects.toThrow();
  });

  it('REJECTS a duplicate idempotency key — the double-spend protection', async () => {
    const expiresAt = new Date(Date.now() + 86_400_000);

    await handle.db.insert(idempotencyKeys).values({
      id: testId(21),
      key: 'idem-key-0000001',
      scope: 'pve.battle',
      expiresAt,
    });

    // The retry. The database rejects it — which is why an application-level
    // check-then-insert is not good enough: that is a race, and the race is a double grant.
    await expect(
      handle.db.insert(idempotencyKeys).values({
        id: testId(22),
        key: 'idem-key-0000001',
        scope: 'pve.battle',
        expiresAt,
      }),
    ).rejects.toThrow();
  });

  it('scopes idempotency keys by operation', async () => {
    // The same key in a different scope is a different operation and must be allowed,
    // or a client reusing a key would receive the wrong cached result.
    await expect(
      handle.db.insert(idempotencyKeys).values({
        id: testId(23),
        key: 'idem-key-0000001',
        scope: 'creatures.starter',
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    ).resolves.not.toThrow();
  });

  it('rejects a duplicate species slug within one content version', async () => {
    await expect(
      handle.db.insert(creatureSpecies).values({
        id: testId(24),
        slug: 'koruk',
        contentVersion: CONTENT_VERSION,
        nameKey: 'x',
        descriptionKey: 'x',
        element: 'FIRE',
        class: 'GUARDIAN',
        rarity: 'COMMON',
        growth: {},
        artKey: 'x',
      }),
    ).rejects.toThrow();
  });

  it('allows the same slug in a DIFFERENT content version — the same creature, rebalanced', async () => {
    await expect(
      handle.db.insert(creatureSpecies).values({
        id: testId(25),
        slug: 'koruk',
        contentVersion: '2026.08.01-1',
        nameKey: 'species.koruk.name',
        descriptionKey: 'species.koruk.description',
        element: 'FIRE',
        class: 'GUARDIAN',
        rarity: 'COMMON',
        growth: {},
        artKey: 'koruk',
      }),
    ).resolves.not.toThrow();
  });
});

describe('team membership constraints', () => {
  beforeAll(async () => {
    await handle.db.insert(ownedCreatures).values([
      {
        id: testId(30),
        playerId: testId(2),
        speciesId: testId(3),
        acquiredVia: 'starter',
        contentVersion: CONTENT_VERSION,
      },
      {
        id: testId(31),
        playerId: testId(2),
        speciesId: testId(3),
        acquiredVia: 'battle_reward',
        contentVersion: CONTENT_VERSION,
      },
    ]);
    await handle.db.insert(teams).values({ id: testId(32), playerId: testId(2), name: 'Main' });
    await handle.db
      .insert(teamMembers)
      .values({ id: testId(33), teamId: testId(32), creatureId: testId(30), slot: 0 });
  });

  it('rejects two creatures in the same slot', async () => {
    await expect(
      handle.db
        .insert(teamMembers)
        .values({ id: testId(34), teamId: testId(32), creatureId: testId(31), slot: 0 }),
    ).rejects.toThrow();
  });

  it('rejects the same creature in two slots', async () => {
    // Without this, one creature could occupy all three active slots.
    await expect(
      handle.db
        .insert(teamMembers)
        .values({ id: testId(35), teamId: testId(32), creatureId: testId(30), slot: 1 }),
    ).rejects.toThrow();
  });

  it('accepts a different creature in a different slot', async () => {
    await expect(
      handle.db
        .insert(teamMembers)
        .values({ id: testId(36), teamId: testId(32), creatureId: testId(31), slot: 1 }),
    ).resolves.not.toThrow();
  });
});

describe('referential integrity', () => {
  it('rejects a creature owned by a player who does not exist', async () => {
    await expect(
      handle.db.insert(ownedCreatures).values({
        id: testId(40),
        playerId: testId(999),
        speciesId: testId(3),
        acquiredVia: 'starter',
        contentVersion: CONTENT_VERSION,
      }),
    ).rejects.toThrow();
  });

  it('rejects a creature of a species that does not exist', async () => {
    await expect(
      handle.db.insert(ownedCreatures).values({
        id: testId(41),
        playerId: testId(2),
        speciesId: testId(999),
        acquiredVia: 'starter',
        contentVersion: CONTENT_VERSION,
      }),
    ).rejects.toThrow();
  });
});

describe('transactions', () => {
  it('rolls back every statement when the callback throws', async () => {
    // The property the entire economy design depends on: partial writes are impossible.
    const before = await handle.db.select().from(ownedCreatures);

    await expect(
      handle.db.transaction(async (tx) => {
        await tx.insert(ownedCreatures).values({
          id: testId(50),
          playerId: testId(2),
          speciesId: testId(3),
          acquiredVia: 'battle_reward',
          contentVersion: CONTENT_VERSION,
        });
        throw new Error('deliberate failure');
      }),
    ).rejects.toThrow('deliberate failure');

    const after = await handle.db.select().from(ownedCreatures);
    expect(after).toHaveLength(before.length);
  });

  it('commits when the callback returns', async () => {
    await handle.db.transaction(async (tx) => {
      await tx.insert(ownedCreatures).values({
        id: testId(51),
        playerId: testId(2),
        speciesId: testId(3),
        acquiredVia: 'battle_reward',
        contentVersion: CONTENT_VERSION,
      });
    });

    const rows = await handle.db.select().from(ownedCreatures);
    expect(rows.some((row) => row.id === testId(51))).toBe(true);
  });

  it('rolls back a constraint violation without leaving partial state', async () => {
    const before = await handle.db.select().from(ownedCreatures);

    await expect(
      handle.db.transaction(async (tx) => {
        await tx.insert(ownedCreatures).values({
          id: testId(52),
          playerId: testId(2),
          speciesId: testId(3),
          acquiredVia: 'battle_reward',
          contentVersion: CONTENT_VERSION,
        });
        // Violates the non-negative CHECK — the whole transaction must unwind.
        await tx.insert(materialInventory).values({
          id: testId(53),
          playerId: testId(2),
          materialId: testId(4),
          quantity: -99,
        });
      }),
    ).rejects.toThrow();

    const after = await handle.db.select().from(ownedCreatures);
    expect(after).toHaveLength(before.length);
  });
});
