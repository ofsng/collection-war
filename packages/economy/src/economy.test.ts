import { describe, expect, it } from 'vitest';
import { add, applyBasisPoints, compare, money, multiply, spend, split, subtract } from './money';
import type { LedgerEntry, LedgerTransfer } from './ledger';
import {
  assertBalanced,
  checkConservation,
  checkIdempotencyKeyUniqueness,
  checkNoCurrencyKindMixing,
  checkNonNegativeAmounts,
  checkTransfer,
  checkTransferBalances,
  netAmount,
} from './invariants';

const gold = (amount: number) => money('SOFT', 'GOLD', amount, 0);
const gems = (amount: number) => money('PREMIUM', 'GEM', amount, 0);
const promoGems = (amount: number) => money('PROMO', 'GEM', amount, 0);
const lira = (minorUnits: number) => money('FIAT', 'TRY', minorUnits, 2);

describe('money construction', () => {
  it('rejects fractional amounts outright', () => {
    // Fails loudly at the point of construction rather than producing a value that
    // corrupts every later calculation.
    expect(() => money('SOFT', 'GOLD', 10.5)).toThrow(/integer minor units/);
  });

  it('rejects an implausible precision', () => {
    expect(() => money('FIAT', 'TRY', 100, 9)).toThrow(/precision/);
  });
});

describe('addition and subtraction', () => {
  it('adds amounts of the same currency', () => {
    const result = add(gold(1500), gold(250));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.amount).toBe(1750);
  });

  it('refuses to add different currencies', () => {
    const result = add(gold(100), gems(100));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CURRENCY_KIND_MISMATCH');
  });

  it('refuses to add different KINDS of the same currency symbol', () => {
    // The important case. Both are "GEM", but one was purchased and one was granted.
    // Merging them makes promotional currency indistinguishable from paid currency,
    // which breaks refunds, accounting and any future withdrawal rules.
    const result = add(gems(100), promoGems(100));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CURRENCY_KIND_MISMATCH');
  });

  it('allows a negative result from subtract, since ledger deltas may be negative', () => {
    const result = subtract(gold(100), gold(250));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.amount).toBe(-150);
  });

  it('detects arithmetic beyond the exact-integer range', () => {
    const enormous = gold(Number.MAX_SAFE_INTEGER);
    const result = add(enormous, gold(1000));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toMatch(/exact-integer range/);
  });
});

describe('spend', () => {
  it('deducts an affordable cost', () => {
    const result = spend(gold(1000), gold(250));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.amount).toBe(750);
  });

  it('refuses to overdraw', () => {
    const result = spend(gold(100), gold(250));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INSUFFICIENT_FUNDS');
  });

  it('permits spending an exact balance to zero', () => {
    const result = spend(gold(250), gold(250));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.amount).toBe(0);
  });

  it('rejects a negative cost, which would be a disguised credit', () => {
    // `spend(balance, -100)` must never be a way to add money.
    const result = spend(gold(100), gold(-100));

    expect(result.ok).toBe(false);
  });
});

describe('multiply and rates', () => {
  it('multiplies by a whole quantity', () => {
    const result = multiply(gold(120), 5);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.amount).toBe(600);
  });

  it('rejects a fractional factor, which would reintroduce rounding', () => {
    expect(multiply(gold(120), 0.5).ok).toBe(false);
  });

  it('applies a basis-point rate with explicit floor rounding', () => {
    // 2.5% of 1000 is exactly 25.
    const exact = applyBasisPoints(gold(1000), 250);
    expect(exact.ok).toBe(true);
    if (exact.ok) expect(exact.value.amount).toBe(25);

    // 2.5% of 999 is 24.975 — floored to 24, never 24.975 and never 25.
    const rounded = applyBasisPoints(gold(999), 250);
    expect(rounded.ok).toBe(true);
    if (rounded.ok) expect(rounded.value.amount).toBe(24);
  });

  it('rejects a rate outside [0, 10000] basis points', () => {
    expect(applyBasisPoints(gold(100), -1).ok).toBe(false);
    expect(applyBasisPoints(gold(100), 10_001).ok).toBe(false);
  });
});

describe('split', () => {
  it('distributes the remainder so the parts sum exactly to the original', () => {
    // 100 / 3 must not lose a unit. In a ledger, a lost unit is an unbalanced entry.
    const result = split(gold(100), 3);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((part) => part.amount)).toEqual([34, 33, 33]);
      expect(result.value.reduce((sum, part) => sum + part.amount, 0)).toBe(100);
    }
  });

  it('splits evenly when it divides exactly', () => {
    const result = split(lira(9_999), 3);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.map((part) => part.amount)).toEqual([3333, 3333, 3333]);
  });

  it('rejects a non-positive part count', () => {
    expect(split(gold(100), 0).ok).toBe(false);
  });
});

describe('compare', () => {
  it('orders amounts of the same currency', () => {
    const result = compare(gold(100), gold(250));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(-1);
  });

  it('refuses to compare incompatible currencies', () => {
    expect(compare(gold(100), lira(100)).ok).toBe(false);
  });
});

// ---------------------------------------------------------------- ledger invariants

let entrySequence = 0;

function entry(overrides: Partial<LedgerEntry> & Pick<LedgerEntry, 'direction' | 'amount'>): LedgerEntry {
  entrySequence += 1;
  return {
    id: `entry-${entrySequence}` as never,
    transferId: 'transfer-1' as never,
    accountId: 'wallet-1' as never,
    reason: 'PURCHASE',
    referenceType: 'test',
    referenceId: null,
    idempotencyKey: null,
    recordedAt: '2026-07-28T10:00:00.000Z' as never,
    ...overrides,
  };
}

function transfer(entries: LedgerEntry[], transferId = 'transfer-1'): LedgerTransfer {
  return {
    transferId: transferId as never,
    reason: 'PURCHASE',
    entries,
    occurredAt: '2026-07-28T10:00:00.000Z' as never,
  };
}

describe('ledger invariants', () => {
  it('accepts a balanced two-sided transfer', () => {
    const balanced = transfer([
      entry({ direction: 'DEBIT', amount: gold(500), accountId: 'buyer' as never }),
      entry({ direction: 'CREDIT', amount: gold(500), accountId: 'seller' as never }),
    ]);

    expect(checkTransfer(balanced)).toEqual([]);
    expect(() => assertBalanced(balanced)).not.toThrow();
  });

  it('rejects a transfer that creates value out of nothing', () => {
    // The single most important check in the package: 500 out, 600 in.
    const unbalanced = transfer([
      entry({ direction: 'DEBIT', amount: gold(500) }),
      entry({ direction: 'CREDIT', amount: gold(600) }),
    ]);

    const violations = checkTransferBalances(unbalanced);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.invariant).toBe('TRANSFER_BALANCES');
    expect(() => assertBalanced(unbalanced)).toThrow(/refusing to write transfer/);
  });

  it('rejects a one-sided transfer', () => {
    const oneSided = transfer([entry({ direction: 'CREDIT', amount: gold(500) })]);

    expect(checkTransferBalances(oneSided).length).toBeGreaterThan(0);
  });

  it('accepts a balanced three-sided transfer with a fee', () => {
    // Buyer pays 1000; seller receives 975; platform takes a 25 fee.
    const withFee = transfer([
      entry({ direction: 'DEBIT', amount: gold(1000), accountId: 'buyer' as never }),
      entry({ direction: 'CREDIT', amount: gold(975), accountId: 'seller' as never }),
      entry({ direction: 'CREDIT', amount: gold(25), accountId: 'platform' as never }),
    ]);

    expect(checkTransfer(withFee)).toEqual([]);
  });

  it('rejects mixing currency kinds within one transfer', () => {
    // Would convert a promotional grant into purchased premium currency.
    const laundering = transfer([
      entry({ direction: 'DEBIT', amount: promoGems(100) }),
      entry({ direction: 'CREDIT', amount: gems(100) }),
    ]);

    const violations = checkNoCurrencyKindMixing(laundering);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.invariant).toBe('NO_CURRENCY_KIND_MIXING');
  });

  it('rejects negative entry amounts, since direction carries the sign', () => {
    const doubleNegative = transfer([
      entry({ direction: 'DEBIT', amount: money('SOFT', 'GOLD', -500, 0) }),
      entry({ direction: 'CREDIT', amount: money('SOFT', 'GOLD', -500, 0) }),
    ]);

    expect(checkNonNegativeAmounts(doubleNegative)).toHaveLength(2);
  });

  it('detects one idempotency key producing two transfers', () => {
    // This is what a double-executed retry looks like in the data.
    const key = 'idem-0123456789abcdef' as never;
    const first = transfer([
      entry({ direction: 'DEBIT', amount: gold(100), idempotencyKey: key }),
      entry({ direction: 'CREDIT', amount: gold(100), idempotencyKey: key }),
    ]);
    const duplicate = transfer(
      [
        entry({
          direction: 'DEBIT',
          amount: gold(100),
          idempotencyKey: key,
          transferId: 'transfer-2' as never,
        }),
        entry({
          direction: 'CREDIT',
          amount: gold(100),
          idempotencyKey: key,
          transferId: 'transfer-2' as never,
        }),
      ],
      'transfer-2',
    );

    const violations = checkIdempotencyKeyUniqueness([first, duplicate]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.invariant).toBe('IDEMPOTENCY_KEY_UNIQUENESS');
  });

  it('confirms conservation across a series of balanced transfers', () => {
    const history = [
      transfer(
        [
          entry({ direction: 'DEBIT', amount: gold(1000), accountId: 'faucet' as never }),
          entry({ direction: 'CREDIT', amount: gold(1000), accountId: 'player-a' as never }),
        ],
        't1',
      ),
      transfer(
        [
          entry({ direction: 'DEBIT', amount: gold(300), accountId: 'player-a' as never }),
          entry({ direction: 'CREDIT', amount: gold(300), accountId: 'player-b' as never }),
        ],
        't2',
      ),
    ];

    expect(checkConservation(history)).toEqual([]);
  });

  it('detects value leaking into the system across transfers', () => {
    const leaky = [
      transfer([entry({ direction: 'CREDIT', amount: gold(1000), accountId: 'player-a' as never })], 't1'),
    ];

    expect(checkConservation(leaky).length).toBeGreaterThan(0);
  });

  it('nets a set of entries', () => {
    expect(
      netAmount([
        entry({ direction: 'CREDIT', amount: gold(1000) }),
        entry({ direction: 'DEBIT', amount: gold(400) }),
      ]),
    ).toBe(600);
  });
});
