import type { Brand } from './brand';

/**
 * Money and currency representation — the single most safety-critical type in the
 * shared kernel. See docs/constitution/ECONOMY_INTEGRITY_RULES.md.
 *
 * THREE RULES, NONE OF THEM OPTIONAL:
 *
 * 1. Amounts are INTEGERS in the currency's minor unit. Never a float. `0.1 + 0.2` is
 *    not `0.3` in IEEE-754, and a rounding error in a ledger is a real loss of real
 *    value. Soft currency counts whole units; fiat counts kuruş / cents.
 *
 * 2. An amount is meaningless without its currency. The two always travel together, so
 *    the compiler can reject adding gems to gold or gold to lira.
 *
 * 3. The currency KINDS below are deliberately not interchangeable. Mixing them is the
 *    mechanism by which a game economy leaks real money: if a randomly awarded currency
 *    can be converted to a withdrawable balance, the game is a gambling product. The
 *    type system is the first line of defence; the ledger is the second.
 */

/**
 * `SOFT`   — earned by playing. Sinks and faucets are tuned freely. Never withdrawable.
 * `PREMIUM`— acquired with real money or granted promotionally. Spendable in-game only.
 * `PROMO`  — granted by the operator (compensation, events). Expires. Never withdrawable,
 *            never settleable, and tracked apart from PREMIUM so that a refund or a
 *            compensation grant cannot be laundered into a cash-out.
 * `FIAT`   — real money, minor units, ISO-4217. Used ONLY for purchase records and
 *            marketplace settlement accounting. Not a gameplay currency.
 */
export type CurrencyKind = 'SOFT' | 'PREMIUM' | 'PROMO' | 'FIAT';

export type CurrencyCode = Brand<string, 'CurrencyCode'>;

/** Integer count of minor units. Negative values are legal in ledger deltas, not in balances. */
export type MinorUnits = Brand<number, 'MinorUnits'>;

export interface Money {
  readonly kind: CurrencyKind;
  /** `GOLD`, `GEM`, `EVENT_TOKEN`, or an ISO-4217 code such as `TRY` when kind is FIAT. */
  readonly currency: CurrencyCode;
  readonly amount: MinorUnits;
  /**
   * Digits after the decimal point when formatting. `0` for gameplay currencies (you
   * cannot own half a gem), `2` for TRY and most fiat.
   */
  readonly precision: number;
}

/**
 * The reason a balance changed. Every ledger entry carries one; there is no such thing
 * as an unexplained balance movement. See docs/domains/economy/README.md.
 */
export type LedgerReason =
  | 'PURCHASE'
  | 'REWARD'
  | 'REFUND'
  | 'MARKETPLACE_ESCROW_HOLD'
  | 'MARKETPLACE_ESCROW_RELEASE'
  | 'MARKETPLACE_SETTLEMENT'
  | 'MARKETPLACE_FEE'
  | 'CRAFTING_COST'
  | 'ADMIN_ADJUSTMENT'
  | 'PROMOTIONAL_GRANT'
  | 'EXPIRY';

/**
 * Which side of the double entry this row represents.
 *
 * The economy is modelled as a double-entry ledger: every movement debits one account
 * and credits another, and the sum across all accounts for a currency is invariant.
 * That invariant is what makes duplication and loss detectable rather than silent.
 */
export type LedgerDirection = 'DEBIT' | 'CREDIT';
