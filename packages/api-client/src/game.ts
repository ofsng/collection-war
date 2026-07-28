import { z } from 'zod';
import { isoTimestampSchema, localeSchema, uuidSchema } from '@collection-war/validation';
import type { Result } from '@collection-war/shared-types';
import type { ApiClient } from './client';

/**
 * The game API surface.
 *
 * Every response is PARSED against a schema, never cast. `as CreatureView` would compile
 * happily against a server that changed its contract, and the failure would surface later as
 * an undefined property somewhere unrelated.
 *
 * Every value-creating call takes an idempotency key. The caller generates it ONCE PER
 * INTENT and reuses it on retry — regenerating it defeats the mechanism entirely, which is
 * the most common way idempotency is implemented wrongly.
 */

const statsSchema = z.object({
  health: z.number().int(),
  attack: z.number().int(),
  defense: z.number().int(),
  focus: z.number().int(),
  speed: z.number().int(),
  resistance: z.number().int(),
  critRate: z.number().int(),
  critPower: z.number().int(),
  affinity: z.number().int(),
});

export const creatureSchema = z.object({
  id: uuidSchema,
  speciesSlug: z.string(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  element: z.string(),
  class: z.string(),
  rarity: z.string(),
  artKey: z.string(),
  nickname: z.string().nullable(),
  level: z.number().int(),
  experience: z.number().int(),
  experienceForNextLevel: z.number().int(),
  stats: statsSchema,
  locked: z.boolean(),
  favorite: z.boolean(),
  acquiredVia: z.string(),
});

export const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  playerId: uuidSchema,
  locale: localeSchema,
  displayName: z.string(),
});

export const profileSchema = z.object({
  playerId: uuidSchema,
  displayName: z.string(),
  locale: z.string(),
  accountLevel: z.number().int(),
  experience: z.number().int(),
  hasStarter: z.boolean(),
});

export const starterSchema = z.object({
  slug: z.string(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  element: z.string(),
  class: z.string(),
  rarity: z.string(),
  artKey: z.string(),
  abilities: z.array(z.object({ slug: z.string(), nameKey: z.string(), kind: z.string() })),
});

export const pveNodeSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  chapterSlug: z.string(),
  biomeSlug: z.string(),
  orderIndex: z.number().int(),
  opponentSpeciesSlug: z.string(),
  opponentLevel: z.number().int(),
  cleared: z.boolean(),
  unlocked: z.boolean(),
});

export const battleEventSchema = z.object({
  turn: z.number().int(),
  sequence: z.number().int(),
  type: z.string(),
  data: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
});

export const battleResultSchema = z.object({
  battleId: uuidSchema,
  outcome: z.enum(['SIDE_A', 'SIDE_B', 'DRAW']),
  turnCount: z.number().int(),
  seed: z.string(),
  engineVersion: z.string(),
  contentVersion: z.string(),
  events: z.array(battleEventSchema),
  finalState: z.array(
    z.object({
      instanceId: z.string(),
      side: z.enum(['A', 'B']),
      remainingHealth: z.number().int(),
      maxHealth: z.number().int(),
    }),
  ),
  rewards: z.object({
    experience: z.number().int(),
    materials: z.array(z.object({ materialSlug: z.string(), quantity: z.number().int() })),
  }),
});

export const inventoryEntrySchema = z.object({
  materialSlug: z.string(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  category: z.string(),
  rarity: z.string(),
  iconKey: z.string(),
  quantity: z.number().int(),
});

export const teamSchema = z
  .object({
    id: uuidSchema,
    name: z.string(),
    members: z.array(z.object({ slot: z.number().int(), creatureId: uuidSchema })),
  })
  .nullable();

export type Creature = z.infer<typeof creatureSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Starter = z.infer<typeof starterSchema>;
export type PveNode = z.infer<typeof pveNodeSchema>;
export type BattleResultView = z.infer<typeof battleResultSchema>;
export type InventoryEntry = z.infer<typeof inventoryEntrySchema>;
export type Team = z.infer<typeof teamSchema>;

export function createGameApi(client: ApiClient) {
  return {
    // ── auth ──────────────────────────────────────────────────────────────
    register(input: {
      email: string;
      password: string;
      displayName: string;
      locale?: string;
    }): Promise<Result<Session>> {
      return client.request({
        method: 'POST',
        path: '/api/v1/auth/register',
        body: input,
        schema: sessionSchema,
      });
    },

    login(input: { email: string; password: string }): Promise<Result<Session>> {
      return client.request({
        method: 'POST',
        path: '/api/v1/auth/login',
        body: input,
        schema: sessionSchema,
      });
    },

    refresh(refreshToken: string): Promise<Result<Session>> {
      return client.request({
        method: 'POST',
        path: '/api/v1/auth/refresh',
        body: { refreshToken },
        schema: sessionSchema,
      });
    },

    // ── profile ───────────────────────────────────────────────────────────
    profile(): Promise<Result<Profile>> {
      return client.request({ path: '/api/v1/profile', schema: profileSchema });
    },

    setLocale(locale: string): Promise<Result<Profile>> {
      return client.request({
        method: 'PUT',
        path: '/api/v1/profile/settings/locale',
        body: { locale },
        schema: profileSchema,
      });
    },

    // ── catalog ───────────────────────────────────────────────────────────
    starters(): Promise<Result<{ contentVersion: string; starters: Starter[] }>> {
      return client.request({
        path: '/api/v1/catalog/starters',
        schema: z.object({ contentVersion: z.string(), starters: z.array(starterSchema) }),
      });
    },

    // ── creatures ─────────────────────────────────────────────────────────
    creatures(): Promise<Result<{ creatures: Creature[] }>> {
      return client.request({
        path: '/api/v1/creatures',
        schema: z.object({ creatures: z.array(creatureSchema) }),
      });
    },

    chooseStarter(speciesSlug: string, idempotencyKey: string): Promise<Result<Creature>> {
      return client.request({
        method: 'POST',
        path: '/api/v1/creatures/starter',
        body: { speciesSlug },
        schema: creatureSchema,
        idempotencyKey,
      });
    },

    levelUp(creatureId: string, idempotencyKey: string): Promise<Result<Creature>> {
      return client.request({
        method: 'POST',
        path: `/api/v1/creatures/${creatureId}/level-up`,
        schema: creatureSchema,
        idempotencyKey,
      });
    },

    // ── teams ─────────────────────────────────────────────────────────────
    activeTeam(): Promise<Result<{ team: Team }>> {
      return client.request({
        path: '/api/v1/teams/active',
        schema: z.object({ team: teamSchema }),
      });
    },

    setActiveTeam(input: {
      name: string;
      members: Array<{ slot: number; creatureId: string }>;
    }): Promise<Result<{ id: string; name: string; members: Array<{ slot: number; creatureId: string }> }>> {
      return client.request({
        method: 'PUT',
        path: '/api/v1/teams/active',
        body: input,
        schema: z.object({
          id: uuidSchema,
          name: z.string(),
          members: z.array(z.object({ slot: z.number().int(), creatureId: uuidSchema })),
        }),
      });
    },

    // ── PvE ───────────────────────────────────────────────────────────────
    pveNodes(): Promise<Result<{ nodes: PveNode[] }>> {
      return client.request({
        path: '/api/v1/pve/nodes',
        schema: z.object({ nodes: z.array(pveNodeSchema) }),
      });
    },

    fight(nodeId: string, idempotencyKey: string): Promise<Result<BattleResultView>> {
      return client.request({
        method: 'POST',
        path: `/api/v1/pve/nodes/${nodeId}/battles`,
        schema: battleResultSchema,
        idempotencyKey,
      });
    },

    // ── inventory ─────────────────────────────────────────────────────────
    inventory(): Promise<Result<{ materials: InventoryEntry[] }>> {
      return client.request({
        path: '/api/v1/inventory',
        schema: z.object({ materials: z.array(inventoryEntrySchema) }),
      });
    },
  };
}

export type GameApi = ReturnType<typeof createGameApi>;

/** Re-exported so callers can validate a timestamp without importing the validation package. */
export { isoTimestampSchema };
