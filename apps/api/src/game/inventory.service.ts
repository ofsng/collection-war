import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { schema, type DatabaseHandle } from '@collection-war/database';
import { TOKENS } from '../tokens';

export interface InventoryEntryView {
  readonly materialSlug: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly category: string;
  readonly rarity: string;
  readonly iconKey: string;
  readonly quantity: number;
}

/**
 * Material inventory.
 *
 * Materials are not currency, but they convert into creature value through levelling — so
 * they get the same discipline: every movement is transactional, carries a reason and a
 * source, and is recorded in an append-only history.
 *
 * A quantity that could be assigned rather than derived would have no history, and "where
 * did my materials go?" would become a guess.
 */
@Injectable()
export class InventoryService {
  constructor(@Inject(TOKENS.DATABASE) private readonly database: DatabaseHandle) {}

  async listForPlayer(playerId: string): Promise<InventoryEntryView[]> {
    const rows = await this.database.db
      .select({
        quantity: schema.materialInventory.quantity,
        slug: schema.materialDefinitions.slug,
        nameKey: schema.materialDefinitions.nameKey,
        descriptionKey: schema.materialDefinitions.descriptionKey,
        category: schema.materialDefinitions.category,
        rarity: schema.materialDefinitions.rarity,
        iconKey: schema.materialDefinitions.iconKey,
      })
      .from(schema.materialInventory)
      .innerJoin(
        schema.materialDefinitions,
        eq(schema.materialDefinitions.id, schema.materialInventory.materialId),
      )
      .where(eq(schema.materialInventory.playerId, playerId));

    return rows
      .filter((row) => row.quantity > 0)
      .map((row) => ({
        materialSlug: row.slug,
        nameKey: row.nameKey,
        descriptionKey: row.descriptionKey,
        category: row.category,
        rarity: row.rarity,
        iconKey: row.iconKey,
        quantity: row.quantity,
      }));
  }

  /** Quantities keyed by material slug — the shape the domain's level-up rules expect. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle's transaction type
  async quantitiesBySlug(playerId: string, tx?: any): Promise<Map<string, number>> {
    const executor = tx ?? this.database.db;

    const rows = await executor
      .select({ slug: schema.materialDefinitions.slug, quantity: schema.materialInventory.quantity })
      .from(schema.materialInventory)
      .innerJoin(
        schema.materialDefinitions,
        eq(schema.materialDefinitions.id, schema.materialInventory.materialId),
      )
      .where(eq(schema.materialInventory.playerId, playerId));

    return new Map(rows.map((row: { slug: string; quantity: number }) => [row.slug, row.quantity]));
  }

  /**
   * Grants materials inside the caller's transaction.
   *
   * Upserts the stack and writes an append-only transaction row. The `sourceType` and
   * `sourceId` are what make every material a player holds traceable to the thing that
   * produced it.
   */
  async grant(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle's transaction type
    tx: any,
    playerId: string,
    materials: ReadonlyArray<{ materialSlug: string; quantity: number }>,
    reason: string,
    sourceType: string,
    sourceId: string,
    idempotencyKey: string | null,
  ): Promise<void> {
    for (const material of materials) {
      const definition = await this.definitionBySlug(tx, material.materialSlug);
      if (!definition) continue;

      await tx
        .insert(schema.materialInventory)
        .values({
          id: randomUUID(),
          playerId,
          materialId: definition.id,
          quantity: material.quantity,
        })
        .onConflictDoUpdate({
          target: [schema.materialInventory.playerId, schema.materialInventory.materialId],
          set: {
            quantity: sql`${schema.materialInventory.quantity} + ${material.quantity}`,
            version: sql`${schema.materialInventory.version} + 1`,
            updatedAt: new Date(),
          },
        });

      await tx.insert(schema.inventoryTransactions).values({
        id: randomUUID(),
        playerId,
        materialId: definition.id,
        delta: material.quantity,
        reason,
        sourceType,
        sourceId,
        idempotencyKey,
      });
    }
  }

  /**
   * Consumes materials inside the caller's transaction.
   *
   * The `quantity >= ?` predicate is the safety property: if the player no longer has enough,
   * the update matches nothing and this throws rather than driving the stack negative. The
   * CHECK constraint is the second line of defence, and would abort the transaction.
   */
  async consume(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle's transaction type
    tx: any,
    playerId: string,
    materialSlug: string,
    quantity: number,
    reason: string,
    sourceId: string,
  ): Promise<void> {
    const definition = await this.definitionBySlug(tx, materialSlug);
    if (!definition) throw new Error(`Unknown material: ${materialSlug}`);

    const updated = await tx
      .update(schema.materialInventory)
      .set({
        quantity: sql`${schema.materialInventory.quantity} - ${quantity}`,
        version: sql`${schema.materialInventory.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.materialInventory.playerId, playerId),
          eq(schema.materialInventory.materialId, definition.id),
          sql`${schema.materialInventory.quantity} >= ${quantity}`,
        ),
      )
      .returning({ id: schema.materialInventory.id });

    if (updated.length === 0) {
      throw new Error(`Insufficient ${materialSlug}: cannot consume ${quantity}`);
    }

    await tx.insert(schema.inventoryTransactions).values({
      id: randomUUID(),
      playerId,
      materialId: definition.id,
      delta: -quantity,
      reason,
      sourceType: 'creature',
      sourceId,
      idempotencyKey: null,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle's transaction type
  private async definitionBySlug(tx: any, slug: string): Promise<{ id: string } | null> {
    const rows = await tx
      .select({ id: schema.materialDefinitions.id })
      .from(schema.materialDefinitions)
      .where(eq(schema.materialDefinitions.slug, slug))
      .limit(1);

    return rows[0] ?? null;
  }
}
