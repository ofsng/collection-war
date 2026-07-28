import {
  err,
  ok,
  type CurrencyCode,
  type CurrencyKind,
  type MinorUnits,
  type Money,
  type Result,
} from '@collection-war/shared-types';
import { DomainErrors } from '@collection-war/domain';

/**
 * Exact money arithmetic.
 *
 * Every operation here is integer-only and total: it either returns a correct result or
 * an error. There is no rounding, no floating point, and no silent coercion, because
 * every one of those is a way for value to be created or destroyed without a trace.
 *
 * Operations return `Result` rather than throwing. "You cannot afford this" is an ordinary
 * outcome the caller must handle, not an exception.
 */

export function money(kind: CurrencyKind, currency: string, amount: number, precision = 0): Money {
  if (!Number.isInteger(amount)) {
    // Thrown, not returned: a fractional literal in the source is a programming error the
    // developer must fix, not a runtime condition a caller can recover from.
    throw new Error(`Money amounts must be integer minor units. Received: ${amount}`);
  }
  if (precision < 0 || precision > 4 || !Number.isInteger(precision)) {
    throw new Error(`Invalid currency precision: ${precision}`);
  }

  return {
    kind,
    currency: currency as CurrencyCode,
    amount: amount as MinorUnits,
    precision,
  };
}

/**
 * Two amounts are compatible only if kind, currency AND precision all match.
 *
 * Checking `currency` alone is not enough. The kinds exist to keep promotional grants,
 * purchased premium currency and real money separate — see the note in
 * `shared-types/money.ts`. A function that adds a PROMO grant to a PREMIUM balance has
 * just made promotional currency indistinguishable from purchased currency, and any
 * downstream withdrawal or refund logic is now wrong.
 */
export function isSameCurrency(a: Money, b: Money): boolean {
  return a.kind === b.kind && a.currency === b.currency && a.precision === b.precision;
}

export function add(a: Money, b: Money): Result<Money> {
  if (!isSameCurrency(a, b)) {
    return DomainErrors.currencyKindMismatch(`${a.kind}:${a.currency}`, `${b.kind}:${b.currency}`);
  }

  return checkedResult(a, a.amount + b.amount);
}

export function subtract(a: Money, b: Money): Result<Money> {
  if (!isSameCurrency(a, b)) {
    return DomainErrors.currencyKindMismatch(`${a.kind}:${a.currency}`, `${b.kind}:${b.currency}`);
  }

  return checkedResult(a, a.amount - b.amount);
}

/**
 * Subtracts, refusing to go below zero.
 *
 * This is what a spend uses. A plain `subtract` producing -50 gold would be a *valid*
 * ledger delta but an *invalid* balance, and the difference between those two is the
 * difference between an audit trail and an overdraft.
 */
export function spend(balance: Money, cost: Money): Result<Money> {
  if (!isSameCurrency(balance, cost)) {
    return DomainErrors.currencyKindMismatch(
      `${balance.kind}:${balance.currency}`,
      `${cost.kind}:${cost.currency}`,
    );
  }
  if (cost.amount < 0) {
    return DomainErrors.currencyKindMismatch('non-negative cost', `${cost.amount}`);
  }
  if (balance.amount < cost.amount) {
    return DomainErrors.insufficientFunds(balance.currency);
  }

  return ok({ ...balance, amount: (balance.amount - cost.amount) as MinorUnits });
}

/**
 * Multiplies by a whole quantity — "5 of this item at 120 gold each".
 *
 * Only integer factors are accepted. A percentage discount or a marketplace fee is NOT a
 * float multiplication; it is `applyBasisPoints`, which defines its rounding explicitly.
 */
export function multiply(value: Money, factor: number): Result<Money> {
  if (!Number.isInteger(factor) || factor < 0) {
    return DomainErrors.currencyKindMismatch('non-negative integer factor', String(factor));
  }

  return checkedResult(value, value.amount * factor);
}

/**
 * Applies a rate expressed in basis points (1 bp = 0.01%). A 2.5% fee is 250.
 *
 * Basis points rather than a float rate, and explicit floor rounding, because the rounding
 * rule must be a stated decision rather than whatever IEEE-754 happened to do. Flooring
 * means a fee always rounds in the payer's favour by at most one minor unit — a bias we
 * choose knowingly, and one that cannot accumulate into a shortfall for the platform.
 */
export function applyBasisPoints(value: Money, basisPoints: number): Result<Money> {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    return DomainErrors.currencyKindMismatch('basis points in [0, 10000]', String(basisPoints));
  }

  return checkedResult(value, Math.floor((value.amount * basisPoints) / 10_000));
}

/**
 * Splits an amount into `parts` shares that sum EXACTLY to the original.
 *
 * The remainder is distributed one minor unit at a time to the earliest shares rather than
 * being rounded away. Splitting 100 gold three ways gives [34, 33, 33], not [33, 33, 33]
 * with one unit vanishing. In a ledger, a vanished unit is an unbalanced entry.
 */
export function split(value: Money, parts: number): Result<readonly Money[]> {
  if (!Number.isInteger(parts) || parts < 1) {
    return DomainErrors.currencyKindMismatch('positive integer part count', String(parts));
  }

  const base = Math.floor(value.amount / parts);
  const remainder = value.amount - base * parts;

  return ok(
    Array.from({ length: parts }, (_unused, index) =>
      money(value.kind, value.currency, base + (index < remainder ? 1 : 0), value.precision),
    ),
  );
}

export function isZero(value: Money): boolean {
  return value.amount === 0;
}

export function isNegative(value: Money): boolean {
  return value.amount < 0;
}

export function compare(a: Money, b: Money): Result<number> {
  if (!isSameCurrency(a, b)) {
    return DomainErrors.currencyKindMismatch(`${a.kind}:${a.currency}`, `${b.kind}:${b.currency}`);
  }
  return ok(Math.sign(a.amount - b.amount));
}

/**
 * Guards every arithmetic result against silent precision loss.
 *
 * Above `Number.MAX_SAFE_INTEGER`, JavaScript integers stop being exact — `2^53 + 1`
 * equals `2^53`. A balance that large is certainly a bug or an exploit, and continuing
 * with a value the runtime can no longer represent correctly is how an economy prints
 * money.
 */
function checkedResult(reference: Money, amount: number): Result<Money> {
  if (!Number.isSafeInteger(amount)) {
    return err({
      category: 'VALIDATION',
      code: 'VALIDATION_FAILED',
      message: 'Currency arithmetic exceeded the exact-integer range',
      details: { currency: reference.currency, amount: String(amount) },
    });
  }

  return ok({ ...reference, amount: amount as MinorUnits });
}
