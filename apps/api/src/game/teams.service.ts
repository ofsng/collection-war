import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { schema, type DatabaseHandle } from '@collection-war/database';
import { DomainErrors } from '@collection-war/domain';
import { err, ok, type Result } from '@collection-war/shared-types';
import { TOKENS } from '../tokens';

export interface TeamView {
  readonly id: string;
  readonly name: string;
  readonly members: ReadonlyArray<{ readonly slot: number; readonly creatureId: string }>;
}

/** Slots 0-2 are active; slot 3 is the reserve. */
const MAX_SLOT = 3;

/**
 * Teams.
 *
 * A team exists only to enter a battle, which is why it has no invariants of its own beyond
 * membership validity — and why membership validity is checked strictly.
 */
@Injectable()
export class TeamsService {
  constructor(@Inject(TOKENS.DATABASE) private readonly database: DatabaseHandle) {}

  async getActive(playerId: string): Promise<TeamView | null> {
    const teams = await this.database.db
      .select()
      .from(schema.teams)
      .where(and(eq(schema.teams.playerId, playerId), eq(schema.teams.isActive, true)))
      .limit(1);

    const team = teams[0];
    if (!team) return null;

    const members = await this.database.db
      .select({ slot: schema.teamMembers.slot, creatureId: schema.teamMembers.creatureId })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.teamId, team.id));

    return {
      id: team.id,
      name: team.name,
      members: members.sort((a, b) => a.slot - b.slot),
    };
  }

  /**
   * Replaces the active team's membership.
   *
   * Validates, in this order — each check exists because skipping it is a real exploit:
   *
   *   1. Slots are within range and not duplicated.
   *   2. A creature appears at most once — otherwise one creature could fill every slot.
   *   3. **Every creature is owned by this player**, verified against the database.
   *   4. No creature is locked — a listed creature must not be able to fight.
   */
  async setActiveTeam(
    playerId: string,
    name: string,
    members: ReadonlyArray<{ slot: number; creatureId: string }>,
  ): Promise<Result<TeamView>> {
    if (members.length === 0) {
      return err({
        category: 'VALIDATION',
        code: 'VALIDATION_FAILED',
        message: 'A team must contain at least one creature',
      });
    }

    const slots = members.map((member) => member.slot);
    if (slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot > MAX_SLOT)) {
      return err({
        category: 'VALIDATION',
        code: 'VALIDATION_FAILED',
        message: `Slots must be integers between 0 and ${MAX_SLOT}`,
      });
    }
    if (new Set(slots).size !== slots.length) {
      return err({
        category: 'VALIDATION',
        code: 'VALIDATION_FAILED',
        message: 'Two creatures cannot occupy the same slot',
      });
    }

    const creatureIds = members.map((member) => member.creatureId);
    if (new Set(creatureIds).size !== creatureIds.length) {
      return err({
        category: 'VALIDATION',
        code: 'VALIDATION_FAILED',
        message: 'A creature cannot occupy more than one slot',
      });
    }

    // Ownership verified against the database, filtered by player — a creature the requester
    // does not own simply does not come back, and the count check below rejects the request.
    const owned = await this.database.db
      .select({ id: schema.ownedCreatures.id, locked: schema.ownedCreatures.locked })
      .from(schema.ownedCreatures)
      .where(
        and(
          eq(schema.ownedCreatures.playerId, playerId),
          inArray(schema.ownedCreatures.id, creatureIds),
          isNull(schema.ownedCreatures.deletedAt),
        ),
      );

    if (owned.length !== creatureIds.length) {
      // 404 rather than 403: distinguishing "does not exist" from "not yours" would let an
      // attacker enumerate other players' creature ids.
      return DomainErrors.notFound('Creature');
    }

    if (owned.some((creature) => creature.locked)) {
      return DomainErrors.forbidden('A locked creature cannot be placed in a team');
    }

    const teamId = await this.database.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: schema.teams.id })
        .from(schema.teams)
        .where(and(eq(schema.teams.playerId, playerId), eq(schema.teams.isActive, true)))
        .limit(1);

      const id = existing[0]?.id ?? randomUUID();

      if (existing[0]) {
        await tx.update(schema.teams).set({ name, updatedAt: new Date() }).where(eq(schema.teams.id, id));
        // Replace membership wholesale. Diffing would be more code for no benefit at this
        // size, and the unique indexes would reject any inconsistent intermediate state.
        await tx.delete(schema.teamMembers).where(eq(schema.teamMembers.teamId, id));
      } else {
        await tx.insert(schema.teams).values({ id, playerId, name, isActive: true });
      }

      await tx.insert(schema.teamMembers).values(
        members.map((member) => ({
          id: randomUUID(),
          teamId: id,
          creatureId: member.creatureId,
          slot: member.slot,
        })),
      );

      return id;
    });

    const view = await this.getActive(playerId);
    return view ? ok(view) : DomainErrors.notFound('Team', teamId);
  }
}
