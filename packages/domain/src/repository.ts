import type { CursorPage, CursorPageRequest, Uuid } from '@collection-war/shared-types';

/**
 * Repository interfaces are declared HERE, in the domain, and implemented in
 * `@collection-war/database`.
 *
 * This is dependency inversion, and it is the thing that keeps the architecture from
 * collapsing into "everything imports the ORM". The domain states what it needs; storage
 * satisfies it. Consequences:
 *   - Domain logic is testable against in-memory fakes, with no database at all.
 *   - Replacing Drizzle, or moving one table to a different store, touches the database
 *     package and nothing else.
 *   - The domain cannot accidentally depend on SQL semantics, because it cannot see them.
 */

/** Read-only access to an entity. */
export interface ReadRepository<TEntity, TId extends Uuid = Uuid> {
  findById(id: TId): Promise<TEntity | null>;
  findManyByIds(ids: readonly TId[]): Promise<readonly TEntity[]>;
  exists(id: TId): Promise<boolean>;
}

export interface PagedRepository<TEntity, TFilter> {
  findPage(filter: TFilter, page: CursorPageRequest): Promise<CursorPage<TEntity>>;
}

/**
 * Write access.
 *
 * `update` takes the version the caller read. The implementation must include it in the
 * `WHERE` clause and fail when no row matches, so a concurrent write is rejected rather
 * than silently overwritten. See `DomainErrors.staleWrite`.
 */
export interface WriteRepository<TEntity, TId extends Uuid = Uuid> {
  insert(entity: TEntity): Promise<void>;
  update(entity: TEntity, expectedVersion: number): Promise<void>;
  /**
   * Soft delete. There is deliberately no hard-delete method on this interface: erasing
   * player-owned data is a deliberate, audited process, not something an ordinary code
   * path can reach for.
   */
  softDelete(id: TId): Promise<void>;
}

/**
 * Idempotency store.
 *
 * Records the outcome of a completed operation against its idempotency key, so a retried
 * request returns the original result instead of performing the work again. Every
 * economy-affecting write goes through this. See
 * docs/architecture/API_ARCHITECTURE.md#idempotency.
 */
export interface IdempotencyRepository {
  /**
   * Reserves a key, or reports that it is already in use.
   *
   * Returns `null` when the reservation succeeded and the caller should do the work, or
   * the stored result when this key has already completed. The reservation itself must be
   * atomic — a check followed by a separate insert is a race, and the race is
   * double-spending.
   */
  reserve(key: string, scope: string): Promise<StoredIdempotentResult | null>;
  complete(key: string, scope: string, result: unknown): Promise<void>;
  release(key: string, scope: string): Promise<void>;
}

export interface StoredIdempotentResult {
  readonly key: string;
  readonly scope: string;
  readonly result: unknown;
  readonly completed: boolean;
}
