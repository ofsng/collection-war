/**
 * Pagination contract — see docs/architecture/API_ARCHITECTURE.md#pagination.
 *
 * Collection War uses CURSOR pagination, not offset pagination, for every list that can
 * grow: inventory, marketplace listings, battle history, notifications.
 *
 * Offset pagination is wrong here for two reasons:
 *   - Correctness: rows shift between requests. A marketplace listing sold while the
 *     player is on page 2 silently hides an unrelated listing they never saw.
 *   - Cost: `OFFSET 10000` makes the database walk 10,000 rows it will throw away.
 *
 * The cursor is opaque and server-signed. A client that decodes or fabricates one gets a
 * 400, not a different slice of data.
 */

export type Cursor = string;

export interface CursorPageRequest {
  /** Omitted on the first page. */
  readonly cursor?: Cursor;
  /** Server clamps to its own maximum; a client asking for 100000 gets the cap, not an error. */
  readonly limit?: number;
}

export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly nextCursor: Cursor | null;
  readonly hasMore: boolean;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type SortDirection = 'asc' | 'desc';

export interface SortRequest<TField extends string = string> {
  readonly field: TField;
  readonly direction: SortDirection;
}
