import type { CurrencyKind, Money } from '@collection-war/shared-types';
import type { LedgerEntry, LedgerTransfer } from './ledger';

/**
 * Economy invariants.
 *
 * These are the properties that must hold no matter what code is written on top. They are
 * expressed as executable checks so they can be asserted in unit tests, in integration
 * tests, and (for the cheap ones) at runtime before a transfer is written.
 *
 * An invariant that lives only in a document is a hope. One that fails a build is a rule.
 */

export interface InvariantViolation {
  readonly invariant: string;
  readonly detail: string;
}

/**
 * INVARIANT 1 — every transfer balances.
 *
 * The debits and credits of a single movement must sum to zero, per currency. If they do
 * not, value has been created or destroyed by the movement itself.
 */
export function checkTransferBalances(transfer: LedgerTransfer): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const totals = new Map<string, number>();

  for (const entry of transfer.entries) {
    const key = currencyKey(entry.amount);
    const signed = entry.direction === 'CREDIT' ? entry.amount.amount : -entry.amount.amount;
    totals.set(key, (totals.get(key) ?? 0) + signed);
  }

  for (const [key, total] of totals) {
    if (total !== 0) {
      violations.push({
        invariant: 'TRANSFER_BALANCES',
        detail: `Transfer ${transfer.transferId} does not balance for ${key}: net ${total}`,
      });
    }
  }

  if (transfer.entries.length < 2) {
    violations.push({
      invariant: 'TRANSFER_BALANCES',
      detail: `Transfer ${transfer.transferId} has fewer than two entries; a movement always has two sides`,
    });
  }

  return violations;
}

/**
 * INVARIANT 2 — currency kinds never mix within a transfer.
 *
 * This is the structural barrier between gameplay currency and real money. A transfer that
 * debits PROMO and credits FIAT would convert a promotional grant into a settleable
 * balance, which is both an economic hole and, depending on jurisdiction, a regulatory
 * problem. See docs/constitution/ECONOMY_INTEGRITY_RULES.md.
 */
export function checkNoCurrencyKindMixing(transfer: LedgerTransfer): InvariantViolation[] {
  const kinds = new Set<CurrencyKind>(transfer.entries.map((entry) => entry.amount.kind));

  if (kinds.size <= 1) return [];

  return [
    {
      invariant: 'NO_CURRENCY_KIND_MIXING',
      detail: `Transfer ${transfer.transferId} mixes currency kinds: ${[...kinds].join(', ')}`,
    },
  ];
}

/**
 * INVARIANT 3 — amounts are exact integers.
 *
 * Guards against a float leaking in from an external system, a JSON payload or a
 * mis-scaled unit conversion.
 */
export function checkIntegerAmounts(transfer: LedgerTransfer): InvariantViolation[] {
  return transfer.entries
    .filter((entry) => !Number.isSafeInteger(entry.amount.amount))
    .map((entry) => ({
      invariant: 'INTEGER_AMOUNTS',
      detail: `Entry ${entry.id} has a non-integer or unsafe amount: ${entry.amount.amount}`,
    }));
}

/**
 * INVARIANT 4 — no negative entry amounts.
 *
 * Direction carries the sign. Allowing both a negative amount and a direction gives two
 * encodings for the same movement, and any aggregation that handles only one of them is
 * silently wrong.
 */
export function checkNonNegativeAmounts(transfer: LedgerTransfer): InvariantViolation[] {
  return transfer.entries
    .filter((entry) => entry.amount.amount < 0)
    .map((entry) => ({
      invariant: 'NON_NEGATIVE_AMOUNTS',
      detail: `Entry ${entry.id} has a negative amount; use direction to express the sign`,
    }));
}

/**
 * INVARIANT 5 — one idempotency key produces at most one transfer.
 *
 * Checked across a set of transfers, because that is where the violation is visible: the
 * same key appearing twice means a retried request was executed twice.
 */
export function checkIdempotencyKeyUniqueness(transfers: readonly LedgerTransfer[]): InvariantViolation[] {
  const seen = new Map<string, string>();
  const violations: InvariantViolation[] = [];

  for (const transfer of transfers) {
    for (const key of new Set(transfer.entries.map((entry) => entry.idempotencyKey).filter(Boolean))) {
      const existing = seen.get(key as string);
      if (existing && existing !== transfer.transferId) {
        violations.push({
          invariant: 'IDEMPOTENCY_KEY_UNIQUENESS',
          detail: `Idempotency key ${key} produced two transfers: ${existing} and ${transfer.transferId}`,
        });
      }
      seen.set(key as string, transfer.transferId);
    }
  }

  return violations;
}

/**
 * INVARIANT 6 — conservation across a set of transfers.
 *
 * Summing every entry for a currency across all accounts must yield zero. Any non-zero
 * total means value entered or left the system without a counterparty. Used by the
 * reconciliation job described in docs/domains/economy/README.md.
 */
export function checkConservation(transfers: readonly LedgerTransfer[]): InvariantViolation[] {
  const totals = new Map<string, number>();

  for (const transfer of transfers) {
    for (const entry of transfer.entries) {
      const key = currencyKey(entry.amount);
      const signed = entry.direction === 'CREDIT' ? entry.amount.amount : -entry.amount.amount;
      totals.set(key, (totals.get(key) ?? 0) + signed);
    }
  }

  return [...totals.entries()]
    .filter(([, total]) => total !== 0)
    .map(([key, total]) => ({
      invariant: 'CONSERVATION',
      detail: `Currency ${key} is not conserved across ${transfers.length} transfer(s): net ${total}`,
    }));
}

/** Runs every per-transfer invariant. Cheap enough to call before writing a transfer. */
export function checkTransfer(transfer: LedgerTransfer): InvariantViolation[] {
  return [
    ...checkTransferBalances(transfer),
    ...checkNoCurrencyKindMixing(transfer),
    ...checkIntegerAmounts(transfer),
    ...checkNonNegativeAmounts(transfer),
  ];
}

/**
 * Throws if a transfer violates any invariant.
 *
 * Intended to be called immediately before persistence. An unbalanced transfer must never
 * reach the database — once written, it is append-only and can only be compensated, never
 * removed.
 */
export function assertBalanced(transfer: LedgerTransfer): void {
  const violations = checkTransfer(transfer);

  if (violations.length > 0) {
    throw new Error(
      `Ledger invariant violation — refusing to write transfer ${transfer.transferId}:\n` +
        violations.map((violation) => `  - [${violation.invariant}] ${violation.detail}`).join('\n'),
    );
  }
}

function currencyKey(amount: Money): string {
  return `${amount.kind}:${amount.currency}`;
}

/** Sums a set of entries. Exported for reconciliation reporting. */
export function netAmount(entries: readonly LedgerEntry[]): number {
  return entries.reduce(
    (total, entry) => total + (entry.direction === 'CREDIT' ? entry.amount.amount : -entry.amount.amount),
    0,
  );
}
