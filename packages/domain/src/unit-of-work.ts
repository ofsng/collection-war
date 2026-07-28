/**
 * Unit of work.
 *
 * Every operation that changes more than one thing runs inside one of these. A
 * marketplace purchase moves currency, transfers ownership, closes the listing, writes
 * ledger rows and enqueues an outbox event — and either all of that happens or none of it
 * does. There is no acceptable intermediate state in which a player has paid but does not
 * own the creature.
 *
 * The interface lives in the domain so that application services can express "this is one
 * transaction" without importing a database driver. See
 * docs/architecture/DATA_ARCHITECTURE.md#transactions.
 */

/**
 * A handle to the active transaction, passed to repositories so their writes join it.
 *
 * Opaque on purpose: the domain must not be able to reach through it to raw SQL.
 */
export interface TransactionContext {
  readonly transactionId: string;
}

/**
 * PostgreSQL isolation levels, named as the domain thinks about them.
 *
 * `SERIALIZABLE` is the right choice wherever an invariant spans rows that the statement
 * itself does not lock — for example "this player's total escrowed gold must not exceed
 * their balance", which READ COMMITTED can violate under concurrency. It costs
 * serialization failures that the caller must retry; that cost is smaller than the cost of
 * a duplicated item.
 */
export type IsolationLevel = 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';

export interface TransactionOptions {
  readonly isolationLevel?: IsolationLevel;
  /**
   * How many times to retry a serialization failure. Only safe because the work inside is
   * required to be idempotent and side-effect-free until commit — which is exactly why
   * side effects go through the outbox rather than being performed inline.
   */
  readonly maxSerializationRetries?: number;
}

export interface UnitOfWork {
  /**
   * Runs `work` in a transaction, committing on return and rolling back on throw.
   *
   * `work` must not perform external side effects — no HTTP calls, no email, no push
   * notifications. A rolled-back transaction cannot un-send an email. Side effects are
   * enqueued to the outbox inside the transaction and performed after it commits.
   */
  run<T>(work: (context: TransactionContext) => Promise<T>, options?: TransactionOptions): Promise<T>;
}

export const DEFAULT_TRANSACTION_OPTIONS: Required<TransactionOptions> = {
  isolationLevel: 'READ_COMMITTED',
  maxSerializationRetries: 3,
};

/**
 * Operations that MUST use `SERIALIZABLE`.
 *
 * Kept as data, next to the interface, so that the list is reviewable in one place rather
 * than scattered across call sites where a missing option is invisible.
 */
export const SERIALIZABLE_OPERATIONS = [
  'marketplace.purchase',
  'marketplace.createListing',
  'marketplace.cancelListing',
  'economy.transfer',
  'economy.spend',
  'inventory.consume',
  'crafting.craft',
  'rewards.claim',
] as const;
