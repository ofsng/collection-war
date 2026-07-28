import { randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { schema, type DatabaseHandle } from '@collection-war/database';
import {
  computeEffectiveStats,
  createSeededRandom,
  deriveSeed,
  DomainErrors,
  resolveRewards,
  type RewardTable,
} from '@collection-war/domain';
import { createBattleEngine, type BattleCreature, type BattleResult } from '@collection-war/battle-engine';
import { err, ok, type Result } from '@collection-war/shared-types';
import { TOKENS } from '../tokens';
import { ContentService } from './content.service';
import { InventoryService } from './inventory.service';
import { completeIdempotencyKey, reserveIdempotencyKey } from '../common/idempotency';

export interface PveNodeView {
  readonly id: string;
  readonly slug: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly chapterSlug: string;
  readonly biomeSlug: string;
  readonly orderIndex: number;
  readonly opponentSpeciesSlug: string;
  readonly opponentLevel: number;
  readonly cleared: boolean;
  readonly unlocked: boolean;
}

export interface BattleOutcomeView {
  readonly battleId: string;
  readonly outcome: BattleResult['outcome'];
  readonly turnCount: number;
  readonly seed: string;
  readonly engineVersion: string;
  readonly contentVersion: string;
  readonly events: BattleResult['events'];
  readonly finalState: BattleResult['finalState'];
  readonly rewards: {
    readonly experience: number;
    readonly materials: ReadonlyArray<{ readonly materialSlug: string; readonly quantity: number }>;
  };
}

/**
 * PvE — chapters, nodes and battle resolution.
 *
 * The whole battle resolves in ONE server call. The client submits intent ("fight this
 * node with this team") and receives a result plus a replay log, which it animates.
 *
 * There is deliberately no endpoint that accepts a per-turn action, an outcome, a damage
 * figure or a reward list. Live turn submission is only needed for live PvP, which
 * ADR-0027 defers.
 */
@Injectable()
export class PveService {
  private readonly engine = createBattleEngine();

  constructor(
    @Inject(TOKENS.DATABASE) private readonly database: DatabaseHandle,
    private readonly content: ContentService,
    private readonly inventory: InventoryService,
  ) {}

  async listNodes(playerId: string): Promise<PveNodeView[]> {
    const version = await this.content.currentVersion();

    const nodes = await this.database.db
      .select()
      .from(schema.pveNodes)
      .where(eq(schema.pveNodes.contentVersion, version))
      .orderBy(asc(schema.pveNodes.orderIndex));

    const progress = await this.database.db
      .select({ nodeId: schema.playerPveProgress.nodeId, clearedAt: schema.playerPveProgress.clearedAt })
      .from(schema.playerPveProgress)
      .where(eq(schema.playerPveProgress.playerId, playerId));

    const clearedSlugs = new Set(
      nodes
        .filter((node) => progress.some((row) => row.nodeId === node.id && row.clearedAt !== null))
        .map((node) => node.slug),
    );

    const views: PveNodeView[] = [];
    for (const node of nodes) {
      const opponent = await this.content.speciesById(version, node.opponentSpeciesId);

      views.push({
        id: node.id,
        slug: node.slug,
        nameKey: node.nameKey,
        descriptionKey: node.descriptionKey,
        chapterSlug: node.chapterSlug,
        biomeSlug: node.biomeSlug,
        orderIndex: node.orderIndex,
        opponentSpeciesSlug: opponent?.slug ?? 'unknown',
        opponentLevel: node.opponentLevel,
        cleared: clearedSlugs.has(node.slug),
        // Unlock rules are enforced SERVER-SIDE at battle time too. This flag is for display;
        // a client that ignores it still cannot start a locked node.
        unlocked: node.requiresNodeSlug === null || clearedSlugs.has(node.requiresNodeSlug),
      });
    }

    return views;
  }

  /**
   * Fights a node.
   *
   * The ordering matters and follows docs/architecture/TRANSACTION_BOUNDARIES.md:
   * loads and pure resolution happen OUTSIDE the transaction, because resolution is
   * CPU-bound and holding a transaction open across it would hold locks for no reason.
   * Every write then happens inside one transaction.
   */
  async fight(playerId: string, nodeId: string, idempotencyKey: string): Promise<Result<BattleOutcomeView>> {
    const version = await this.content.currentVersion();

    // ── 1. Load and authorize ────────────────────────────────────────────────
    const nodes = await this.database.db
      .select()
      .from(schema.pveNodes)
      .where(and(eq(schema.pveNodes.id, nodeId), eq(schema.pveNodes.contentVersion, version)))
      .limit(1);

    const node = nodes[0];
    if (!node) return DomainErrors.notFound('PvE node', nodeId);

    if (node.requiresNodeSlug !== null) {
      const unlocked = await this.hasCleared(playerId, node.requiresNodeSlug, version);
      if (!unlocked) {
        return DomainErrors.forbidden('This node is locked. Clear the previous node first.');
      }
    }

    const team = await this.loadTeamCreatures(playerId, version);
    if (team.length === 0) {
      return err({
        category: 'PRECONDITION_FAILED',
        code: 'VALIDATION_FAILED',
        message: 'An active team with at least one creature is required',
        messageKey: 'error.no_team' as never,
      });
    }

    const opponentSpecies = await this.content.speciesById(version, node.opponentSpeciesId);
    if (!opponentSpecies) return DomainErrors.notFound('Opponent species', node.opponentSpeciesId);

    // ── 2. Resolve — pure, deterministic, outside any transaction ────────────
    // The seed is generated HERE, server-side. A client-supplied seed would be outcome
    // selection: roll locally until you like the result, then submit that seed.
    const seed = randomBytes(16).toString('hex');
    const battleId = randomUUID();

    const opponent: BattleCreature = {
      instanceId: `opponent-${battleId}` as never,
      speciesSlug: opponentSpecies.slug,
      nameKey: opponentSpecies.nameKey,
      element: opponentSpecies.element as BattleCreature['element'],
      level: node.opponentLevel,
      stats: computeEffectiveStats({
        growth: opponentSpecies.growth,
        level: node.opponentLevel,
        contentVersion: version,
      }),
      abilities: opponentSpecies.abilities,
    };

    const result = this.engine.resolve({
      battleId: battleId as never,
      seed,
      contentVersion: version,
      startedAt: new Date().toISOString() as never,
      participants: [
        { playerId: playerId as never, side: 'A', creatures: team },
        { playerId: null, side: 'B', creatures: [opponent] },
      ],
    });

    // Rewards are computed server-side from the node's authored table, on their own derived
    // stream so that adding a battle roll later cannot change historical drops.
    const rewardTable = node.rewards as RewardTable;
    const won = result.outcome === 'SIDE_A';
    const rewards = won
      ? resolveRewards(rewardTable, createSeededRandom(deriveSeed(seed, 'drops')))
      : { experience: 0, materials: [] };

    // ── 3. Persist — every write in one transaction ──────────────────────────
    const persisted = await this.database.db.transaction(async (tx) => {
      const reservation = await reserveIdempotencyKey<BattleOutcomeView>(
        tx,
        idempotencyKey,
        'pve.battle',
        playerId,
      );

      if (reservation === 'IN_PROGRESS') return { conflict: true as const };
      // A retry returns the ORIGINAL battle — not a new one, and not a second set of rewards.
      if (reservation.replayed) return { replayed: reservation.result };

      await tx.insert(schema.battleSessions).values({
        id: battleId,
        playerId,
        nodeId,
        seed,
        engineVersion: result.engineVersion,
        contentVersion: result.contentVersion,
        outcome: result.outcome,
        turnCount: result.turnCount,
        events: result.events,
        finalState: result.finalState,
      });

      if (won) {
        if (rewards.materials.length > 0) {
          await this.inventory.grant(
            tx,
            playerId,
            rewards.materials,
            'battle_reward',
            'battle',
            battleId,
            idempotencyKey,
          );
        }

        if (rewards.experience > 0) {
          // Experience goes to the first active creature. Distributing across the team is a
          // design decision that belongs with the 3v3 work, not invented here.
          const first = team[0];
          if (first) {
            await tx
              .update(schema.ownedCreatures)
              .set({
                experience: sql`${schema.ownedCreatures.experience} + ${rewards.experience}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(schema.ownedCreatures.id, first.instanceId as string),
                  eq(schema.ownedCreatures.playerId, playerId),
                ),
              );
          }
        }

        await this.markCleared(tx, playerId, nodeId);
      }

      await tx.insert(schema.outbox).values({
        id: randomUUID(),
        eventName: 'Battle.Resolved',
        aggregateType: 'battle',
        aggregateId: battleId,
        payload: {
          battleId,
          playerId,
          nodeId,
          outcome: result.outcome,
          engineVersion: result.engineVersion,
          contentVersion: result.contentVersion,
        },
        correlationId: randomUUID(),
      });

      const view: BattleOutcomeView = {
        battleId,
        outcome: result.outcome,
        turnCount: result.turnCount,
        seed,
        engineVersion: result.engineVersion,
        contentVersion: result.contentVersion,
        events: result.events,
        finalState: result.finalState,
        rewards,
      };

      await completeIdempotencyKey(tx, idempotencyKey, 'pve.battle', view);
      return { view };
    });

    if ('conflict' in persisted) {
      return err({
        category: 'CONFLICT',
        code: 'RESOURCE_CONFLICT',
        message: 'This battle is already being resolved. Retry shortly.',
      });
    }
    if ('replayed' in persisted && persisted.replayed) return ok(persisted.replayed);

    if (!('view' in persisted) || !persisted.view) {
      return DomainErrors.notFound('Battle', battleId);
    }
    return ok(persisted.view);
  }

  async getBattle(playerId: string, battleId: string): Promise<Result<BattleOutcomeView>> {
    const rows = await this.database.db
      .select()
      .from(schema.battleSessions)
      .where(
        and(
          eq(schema.battleSessions.id, battleId),
          // Not a participant → indistinguishable from "does not exist".
          eq(schema.battleSessions.playerId, playerId),
        ),
      )
      .limit(1);

    const battle = rows[0];
    if (!battle) return DomainErrors.notFound('Battle', battleId);

    return ok({
      battleId: battle.id,
      outcome: battle.outcome as BattleResult['outcome'],
      turnCount: battle.turnCount,
      seed: battle.seed,
      engineVersion: battle.engineVersion,
      contentVersion: battle.contentVersion,
      events: battle.events as BattleResult['events'],
      finalState: battle.finalState as BattleResult['finalState'],
      rewards: { experience: 0, materials: [] },
    });
  }

  private async hasCleared(playerId: string, nodeSlug: string, version: string): Promise<boolean> {
    const rows = await this.database.db
      .select({ clearedAt: schema.playerPveProgress.clearedAt })
      .from(schema.playerPveProgress)
      .innerJoin(schema.pveNodes, eq(schema.pveNodes.id, schema.playerPveProgress.nodeId))
      .where(
        and(
          eq(schema.playerPveProgress.playerId, playerId),
          eq(schema.pveNodes.slug, nodeSlug),
          eq(schema.pveNodes.contentVersion, version),
        ),
      )
      .limit(1);

    return rows[0]?.clearedAt !== null && rows[0] !== undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle's transaction type
  private async markCleared(tx: any, playerId: string, nodeId: string): Promise<void> {
    await tx
      .insert(schema.playerPveProgress)
      .values({ id: randomUUID(), playerId, nodeId, clearedAt: new Date(), attempts: 1 })
      .onConflictDoUpdate({
        target: [schema.playerPveProgress.playerId, schema.playerPveProgress.nodeId],
        set: { clearedAt: new Date(), updatedAt: new Date() },
      });
  }

  /** Loads the player's active team as engine-ready creatures, with stats derived. */
  private async loadTeamCreatures(playerId: string, version: string): Promise<BattleCreature[]> {
    const rows = await this.database.db
      .select({
        creatureId: schema.ownedCreatures.id,
        speciesId: schema.ownedCreatures.speciesId,
        level: schema.ownedCreatures.level,
        slot: schema.teamMembers.slot,
      })
      .from(schema.teams)
      .innerJoin(schema.teamMembers, eq(schema.teamMembers.teamId, schema.teams.id))
      .innerJoin(schema.ownedCreatures, eq(schema.ownedCreatures.id, schema.teamMembers.creatureId))
      .where(
        and(
          eq(schema.teams.playerId, playerId),
          eq(schema.teams.isActive, true),
          isNull(schema.ownedCreatures.deletedAt),
        ),
      );

    const creatures: BattleCreature[] = [];

    // Sorted by slot: ordering is part of the engine's determinism contract, so it must not
    // depend on whatever order the database returned rows in.
    for (const row of rows.sort((a, b) => a.slot - b.slot)) {
      // Only the three active slots fight; slot 3 is the reserve.
      if (row.slot > 2) continue;

      const species = await this.content.speciesById(version as never, row.speciesId);
      if (!species) continue;

      creatures.push({
        instanceId: row.creatureId as never,
        speciesSlug: species.slug,
        nameKey: species.nameKey,
        element: species.element as BattleCreature['element'],
        level: row.level,
        stats: computeEffectiveStats({
          growth: species.growth,
          level: row.level,
          contentVersion: version as never,
        }),
        abilities: species.abilities,
      });
    }

    return creatures;
  }
}
