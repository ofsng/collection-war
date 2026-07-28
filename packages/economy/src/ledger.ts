import type {
  IdempotencyKey,
  IsoTimestamp,
  LedgerDirection,
  LedgerEntryId,
  LedgerReason,
  Money,
  PlayerId,
  Uuid,
  WalletId,
} from '@collection-war/shared-types';

/**
 * The ledger contract.
 *
 * THE CENTRAL RULE OF THIS PROJECT'S ECONOMY: a balance is never a number that code
 * assigns. It is the sum of immutable ledger entries. Nothing anywhere may write
 * `wallet.balance = x`.
 *
 * Why this matters more than it might appear:
 *   - A mutable balance loses history. "Where did my 5000 gold go?" becomes unanswerable,
 *     and support has to guess.
 *   - A mutable balance hides bugs. A double-granted reward is invisible; with a ledger it
 *     is two rows with the same idempotency key, which is detectable and reversible.
 *   - A mutable balance cannot be reconciled. With double entry, every currency's total
 *     across all accounts is invariant, so duplication or loss shows up as a failed
 *     reconciliation rather than as a player complaint months later.
 *
 * Entries are APPEND-ONLY. A mistake is corrected by writing a compensating entry, never
 * by editing or deleting the original. The wrong entry is part of the history too.
 */

/** Where value sits. Not all accounts belong to a player. */
export type AccountType =
  | 'PLAYER_WALLET' // a player's spendable balance
  | 'ESCROW' // value held during a marketplace transaction
  | 'PLATFORM_REVENUE' // marketplace fees collected
  | 'SYSTEM_FAUCET' // where granted currency originates
  | 'SYSTEM_SINK'; // where spent currency is destroyed

export interface LedgerAccount {
  readonly id: WalletId;
  readonly type: AccountType;
  /** Null for system accounts, which belong to the platform rather than to anyone. */
  readonly playerId: PlayerId | null;
  readonly currency: string;
}

/**
 * One side of one movement. Immutable once written.
 *
 * Every entry belongs to a `transferId` grouping the two-or-more sides of a single
 * movement. The sides of a transfer must sum to zero — see `assertBalanced`.
 */
export interface LedgerEntry {
  readonly id: LedgerEntryId;
  readonly transferId: Uuid;
  readonly accountId: WalletId;
  readonly direction: LedgerDirection;
  readonly amount: Money;
  readonly reason: LedgerReason;
  /**
   * What caused this — a listing id, an order id, a quest id. Makes an entry explicable
   * without joining half the schema.
   */
  readonly referenceType: string;
  readonly referenceId: Uuid | null;
  /**
   * The key that made the originating operation safe to retry. Two entries sharing a key
   * within a scope is, by definition, a duplication bug.
   */
  readonly idempotencyKey: IdempotencyKey | null;
  readonly recordedAt: IsoTimestamp;
}

/**
 * A complete movement: the entries that must be written together, atomically.
 *
 * A transfer is either fully written inside one database transaction or not written at
 * all. Half a transfer is a corrupt ledger.
 */
export interface LedgerTransfer {
  readonly transferId: Uuid;
  readonly reason: LedgerReason;
  readonly entries: readonly LedgerEntry[];
  readonly occurredAt: IsoTimestamp;
}

/**
 * Ledger persistence.
 *
 * Note the absence of `update` and `delete`. That is the append-only rule expressed in the
 * type system rather than in a comment somebody may not read.
 */
export interface LedgerRepository {
  /** Must run inside the caller's transaction, alongside the business change it accounts for. */
  recordTransfer(transfer: LedgerTransfer): Promise<void>;
  /**
   * Computes a balance by summing entries.
   *
   * A cached balance column is a legitimate later optimisation, but it must be derived
   * from and reconcilable against these entries — never the other way round.
   */
  balanceOf(accountId: WalletId): Promise<Money>;
  findByIdempotencyKey(key: IdempotencyKey, scope: string): Promise<LedgerTransfer | null>;
}
