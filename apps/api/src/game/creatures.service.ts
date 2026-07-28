import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { schema, type DatabaseHandle } from '@collection-war/database';
import {
  computeEffectiveStats,
  DomainErrors,
  evaluateLevelUp,
  experienceForNextLevel,
  type Stats,
} from '@collection-war/domain';
import { err, ok, type Result } from '@collection-war/shared-types';
import { TOKENS } from '../tokens';
import { ContentService } from './content.service';
import { completeIdempotencyKey, reserveIdempotencyKey } from '../common/idempotency';
import { InventoryService } from './inventory.service';

export interface CreatureView {
  readonly id: string;
  readonly speciesSlug: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly element: string;
  readonly class: string;
  readonly rarity: string;
  readonly artKey: string;
  readonly nickname: string | null;
  readonly level: number;
  readonly experience: number;
  readonly experienceForNextLevel: number;
  readonly stats: Stats;
  readonly locked: boolean;
  readonly favorite: boolean;
  readonly acquiredVia: string;
}

/**
 * Owned creatures — acquisition, listing and levelling.
 *
 * The most valuable player state in the game, so every write here re-verifies ownership
 * INSIDE the statement (`WHERE player_id = ...`) rather than checking earlier and trusting
 * it. A creature can be sold between a check and a write.
 */
@Injectable()
export class CreaturesService {
  constructor(
    @Inject(TOKENS.DATABASE) private readonly database: DatabaseHandle,
    private readonly content: ContentService,
    private readonly inventory: InventoryService,
  ) {}

  /**
   * Grants the starter creature.
   *
   * ONE PER PLAYER, EVER — guaranteed twice over, because the two mechanisms protect against
   * different failures:
   *
   *   1. The **idempotency key** handles a retried request: the same intent, sent twice.
   *   2. `starter_granted_at`, checked and set inside the transaction, handles two
   *      *different* requests — a double-tap producing two distinct keys.
   *
   * Either alone would leave a hole.
   */
  async grantStarter(
    playerId: string,
    speciesSlug: string,
    idempotencyKey: string,
  ): Promise<Result<CreatureView>> {
    const version = await this.content.currentVersion();
    const species = await this.content.speciesBySlug(version, speciesSlug);

    if (!species || !species.isStarter) {
      return DomainErrors.notFound('Starter species', speciesSlug);
    }

    const outcome = await this.database.db.transaction(async (tx) => {
      const reservation = await reserveIdempotencyKey<{ creatureId: string }>(
        tx,
        idempotencyKey,
        'creatures.starter',
        playerId,
      );

      if (reservation === 'IN_PROGRESS') return { conflict: true as const };
      if (reservation.replayed) return { creatureId: reservation.result.creatureId };

      const profiles = await tx
        .select({ starterGrantedAt: schema.playerProfiles.starterGrantedAt })
        .from(schema.playerProfiles)
        .where(eq(schema.playerProfiles.id, playerId))
        .limit(1);

      const profile = profiles[0];
      if (!profile) return { missingProfile: true as const };

      if (profile.starterGrantedAt !== null) {
        return { alreadyGranted: true as const };
      }

      const creatureId = randomUUID();

      await tx.insert(schema.ownedCreatures).values({
        id: creatureId,
        playerId,
        speciesId: species.id,
        acquiredVia: 'starter',
        contentVersion: version,
      });

      await tx.insert(schema.creatureHistory).values({
        id: randomUUID(),
        creatureId,
        eventType: 'acquired',
        data: { source: 'starter', speciesSlug: species.slug },
      });

      await tx
        .update(schema.playerProfiles)
        .set({ starterGrantedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.playerProfiles.id, playerId));

      await tx.insert(schema.outbox).values({
        id: randomUUID(),
        eventName: 'OwnedCreatures.Acquired',
        aggregateType: 'creature',
        aggregateId: creatureId,
        payload: { playerId, creatureId, speciesId: species.id, source: 'starter' },
        correlationId: randomUUID(),
      });

      await completeIdempotencyKey(tx, idempotencyKey, 'creatures.starter', { creatureId });

      return { creatureId };
    });

    if ('conflict' in outcome) {
      return err({
        category: 'CONFLICT',
        code: 'RESOURCE_CONFLICT',
        message: 'A starter grant is already in progress. Retry shortly.',
      });
    }
    if ('missingProfile' in outcome) return DomainErrors.notFound('Player profile', playerId);
    if ('alreadyGranted' in outcome) {
      return err({
        category: 'CONFLICT',
        code: 'RESOURCE_CONFLICT',
        message: 'A starter has already been granted to this player',
        messageKey: 'error.starter_already_granted' as never,
      });
    }

    const view = await this.getById(playerId, outcome.creatureId);
    return view ? ok(view) : DomainErrors.notFound('Creature', outcome.creatureId);
  }

  async listForPlayer(playerId: string): Promise<CreatureView[]> {
    const version = await this.content.currentVersion();

    const rows = await this.database.db
      .select()
      .from(schema.ownedCreatures)
      .where(and(eq(schema.ownedCreatures.playerId, playerId), isNull(schema.ownedCreatures.deletedAt)));

    const views: CreatureView[] = [];
    for (const row of rows) {
      const view = await this.toView(version, row);
      if (view) views.push(view);
    }

    return views;
  }

  /** Returns `null` when the creature does not exist OR is not this player's — the caller returns 404 for both. */
  async getById(playerId: string, creatureId: string): Promise<CreatureView | null> {
    const version = await this.content.currentVersion();

    const rows = await this.database.db
      .select()
      .from(schema.ownedCreatures)
      .where(
        and(
          eq(schema.ownedCreatures.id, creatureId),
          eq(schema.ownedCreatures.playerId, playerId),
          isNull(schema.ownedCreatures.deletedAt),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row ? this.toView(version, row) : null;
  }

  /**
   * Levels a creature up by exactly one.
   *
   * The decision is made by the pure `evaluateLevelUp` in the domain; this method's job is
   * to apply it atomically — consume materials, update the creature and write history in one
   * transaction, with the version check preventing a lost update.
   */
  async levelUp(playerId: string, creatureId: string, idempotencyKey: string): Promise<Result<CreatureView>> {
    const outcome = await this.database.db.transaction(async (tx) => {
      const reservation = await reserveIdempotencyKey<{ level: number }>(
        tx,
        idempotencyKey,
        'creatures.levelUp',
        playerId,
      );

      if (reservation === 'IN_PROGRESS') return { conflict: true as const };
      if (reservation.replayed) return { replayed: true as const };

      const rows = await tx
        .select()
        .from(schema.ownedCreatures)
        .where(
          and(
            eq(schema.ownedCreatures.id, creatureId),
            // Ownership re-verified in the statement itself.
            eq(schema.ownedCreatures.playerId, playerId),
            isNull(schema.ownedCreatures.deletedAt),
          ),
        )
        .limit(1);

      const creature = rows[0];
      if (!creature) return { notFound: true as const };

      if (creature.locked) {
        return { locked: true as const };
      }

      const materials = await this.inventory.quantitiesBySlug(playerId, tx);

      const decision = evaluateLevelUp({
        currentLevel: creature.level,
        currentExperience: creature.experience,
        availableMaterials: materials,
      });

      if (!decision.ok) return { rejected: decision.error } as const;

      for (const cost of decision.value.consumedMaterials) {
        await this.inventory.consume(tx, playerId, cost.slug, cost.quantity, 'level_up_cost', creatureId);
      }

      const updated = await tx
        .update(schema.ownedCreatures)
        .set({
          level: decision.value.newLevel,
          experience: decision.value.remainingExperience,
          version: creature.version + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.ownedCreatures.id, creatureId),
            eq(schema.ownedCreatures.playerId, playerId),
            // Optimistic concurrency: if the row moved since it was read, this matches
            // nothing and the write is rejected rather than silently overwriting.
            eq(schema.ownedCreatures.version, creature.version),
          ),
        )
        .returning({ id: schema.ownedCreatures.id });

      if (updated.length === 0) return { stale: true as const };

      await tx.insert(schema.creatureHistory).values({
        id: randomUUID(),
        creatureId,
        eventType: 'levelled_up',
        data: { level: decision.value.newLevel },
      });

      await tx.insert(schema.outbox).values({
        id: randomUUID(),
        eventName: 'Progression.LevelReached',
        aggregateType: 'creature',
        aggregateId: creatureId,
        payload: { playerId, creatureId, level: decision.value.newLevel },
        correlationId: randomUUID(),
      });

      await completeIdempotencyKey(tx, idempotencyKey, 'creatures.levelUp', {
        level: decision.value.newLevel,
      });

      return { levelled: true as const };
    });

    if ('conflict' in outcome) {
      return err({
        category: 'CONFLICT',
        code: 'RESOURCE_CONFLICT',
        message: 'Level-up already in progress',
      });
    }
    if ('notFound' in outcome) return DomainErrors.notFound('Creature', creatureId);
    if ('locked' in outcome) return DomainErrors.forbidden('This creature is locked');
    if ('stale' in outcome) return DomainErrors.staleWrite('Creature', 0, 0);
    if ('rejected' in outcome && outcome.rejected) return err(outcome.rejected);

    const view = await this.getById(playerId, creatureId);
    return view ? ok(view) : DomainErrors.notFound('Creature', creatureId);
  }

  private async toView(
    version: string,
    row: typeof schema.ownedCreatures.$inferSelect,
  ): Promise<CreatureView | null> {
    const species = await this.content.speciesById(version as never, row.speciesId);
    if (!species) return null;

    return {
      id: row.id,
      speciesSlug: species.slug,
      nameKey: species.nameKey,
      descriptionKey: species.descriptionKey,
      element: species.element,
      class: species.class,
      rarity: species.rarity,
      artKey: species.artKey,
      nickname: row.nickname,
      level: row.level,
      experience: row.experience,
      experienceForNextLevel: experienceForNextLevel(row.level),
      // Derived, never stored — so they cannot drift from the content version.
      stats: computeEffectiveStats({
        growth: species.growth,
        level: row.level,
        contentVersion: version as never,
      }),
      locked: row.locked,
      favorite: row.favorite,
      acquiredVia: row.acquiredVia,
    };
  }
}
