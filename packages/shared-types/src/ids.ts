import type { Brand } from './brand';

/**
 * Identifier strategy — see docs/architecture/DATA_ARCHITECTURE.md#id-strategy.
 *
 * Every entity id is a UUIDv7 string.
 *
 * Why UUIDv7 rather than a bigint sequence:
 *   - The server can mint an id before the row exists, which the transactional outbox
 *     and idempotency keys both rely on.
 *   - It is time-ordered, so it indexes well as a primary key (unlike UUIDv4, which
 *     scatters B-tree inserts).
 *   - It does not leak business volume. A sequential id tells a competitor exactly how
 *     many players signed up, and lets a client enumerate other players' resources.
 *
 * Ids are opaque to clients. A client must never parse, derive or predict one.
 */
export type Uuid = Brand<string, 'Uuid'>;

export type PlayerId = Brand<string, 'PlayerId'>;
export type AccountId = Brand<string, 'AccountId'>;
export type SessionId = Brand<string, 'SessionId'>;

export type CreatureSpeciesId = Brand<string, 'CreatureSpeciesId'>;
export type OwnedCreatureId = Brand<string, 'OwnedCreatureId'>;

export type ItemDefinitionId = Brand<string, 'ItemDefinitionId'>;
export type InventoryEntryId = Brand<string, 'InventoryEntryId'>;

export type BattleId = Brand<string, 'BattleId'>;
export type TeamId = Brand<string, 'TeamId'>;
export type ExpeditionId = Brand<string, 'ExpeditionId'>;
export type HabitatId = Brand<string, 'HabitatId'>;

export type ListingId = Brand<string, 'ListingId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type LedgerEntryId = Brand<string, 'LedgerEntryId'>;
export type WalletId = Brand<string, 'WalletId'>;

export type QuestId = Brand<string, 'QuestId'>;
export type NotificationId = Brand<string, 'NotificationId'>;

/**
 * Client-supplied key that makes a write safe to retry. The server stores it alongside
 * the result, so a retry returns the original outcome rather than performing the
 * operation twice. Mandatory on every economy-affecting write — see
 * docs/architecture/API_ARCHITECTURE.md#idempotency.
 */
export type IdempotencyKey = Brand<string, 'IdempotencyKey'>;

/**
 * Travels with a request across the API, workers and logs so one user action can be
 * reconstructed end to end. See docs/architecture/OBSERVABILITY_ARCHITECTURE.md.
 */
export type CorrelationId = Brand<string, 'CorrelationId'>;
