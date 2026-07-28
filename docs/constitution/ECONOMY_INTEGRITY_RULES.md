# Economy Integrity Rules

> **Binding, and the strictest rules in this project.** A violation is a defect that can
> destroy real value and real trust. Changing one requires an ADR **and** explicit owner
> approval.
> Audience: anyone touching currency, inventory, ownership, rewards or the marketplace.

---

## Why these rules are stricter than the rest

A rendering bug annoys a player for a moment. An economy bug:

- **cannot be quietly fixed** — players saw the balance, and taking it back is worse than
  the bug;
- **compounds** — a duplication exploit spreads through the marketplace within hours, and
  every subsequent trade is built on invalid value;
- **is often invisible** — a slow leak looks like normal inflation until the currency is
  worthless;
- **may be a legal matter** — where real money is involved, "we lost track of it" is not an
  acceptable answer to a regulator.

So the economy is designed to make these failures **detectable** and **explicable**, not
merely unlikely.

---

## E1. Currency kinds are separate and never convert implicitly

| Kind      | Source                                         | Withdrawable                                                           | Notes                                            |
| --------- | ---------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| `SOFT`    | Earned by playing                              | **Never**                                                              | Freely tuned. Faucets and sinks.                 |
| `PREMIUM` | Purchased with real money, or granted          | **Never**                                                              | Spendable in-game only.                          |
| `PROMO`   | Granted by the operator (compensation, events) | **Never**                                                              | Expires. Tracked apart from `PREMIUM`.           |
| `FIAT`    | Real money                                     | Only behind the flag in [E9](#e9-real-money-withdrawal-stays-disabled) | Purchase records and settlement accounting only. |

A single ledger transfer may never mix kinds. Enforced at three levels: the type system
(`Money` carries its `kind`), the invariant `checkNoCurrencyKindMixing`, and review.

**Why `PROMO` is separate from `PREMIUM`:** if a compensation grant is indistinguishable
from purchased currency, then refunds, accounting and any future withdrawal rule are all
wrong, and a support agent granting goodwill currency is unknowingly creating a cash
liability.

## E2. Balances are derived, never assigned

There is no code path anywhere that writes `wallet.balance = x`.

A balance is the sum of immutable ledger entries. A cached balance column is a legitimate
optimisation **only** if it is derived from and reconcilable against those entries.

**Why:** a mutable balance has no history. "Where did my 5000 gold go?" becomes a guess, a
double-granted reward is invisible, and there is nothing to reconcile against.

## E3. Double entry, and it must balance

Every movement debits at least one account and credits at least one other, summing to zero
per currency. Enforced by `assertBalanced` before any transfer is written.

Accounts include system accounts — `SYSTEM_FAUCET` where granted currency originates,
`SYSTEM_SINK` where spent currency is destroyed — so that even "created from nothing" has a
counterparty and shows up in reconciliation.

## E4. Ledger entries are append-only

No `UPDATE`. No `DELETE`. A mistake is corrected by writing a **compensating entry**.

**Why:** the wrong entry is part of the history too. An audit that can be edited is not an
audit.

## E5. Integers only

Amounts are whole minor units. Never a float, never a decimal string parsed into a float.

`0.1 + 0.2 !== 0.3` in IEEE-754. In a ledger, that difference is real value appearing or
disappearing. Enforced by `minorUnitsSchema` and `checkIntegerAmounts`.

Rounding, where unavoidable (a percentage fee), is an explicit floor via
`applyBasisPoints`, and a split distributes its remainder so the parts sum **exactly** to
the original.

## E6. One transaction, or none of it

A marketplace purchase moves currency, transfers ownership, closes the listing, writes
ledger rows and enqueues an outbox event. All of it commits, or none of it does.

There is no acceptable state in which a player has paid and does not own the creature.

Operations listed in `SERIALIZABLE_OPERATIONS` run at `SERIALIZABLE` isolation, because
their invariants span rows the statements themselves do not lock — and `READ COMMITTED`
will violate them under concurrency.

## E7. Idempotency is mandatory and enforced by the database

Every economy-affecting write carries a client-supplied idempotency key. Uniqueness is
enforced by a **unique index**, not by an application check-then-insert.

**Why the database and not the application:** a check followed by a separate insert is a
race, and under concurrency that race resolves as a double spend. A mobile client on a poor
connection will retry; the retry must return the original result, not perform the work
again.

## E8. Random rewards never become withdrawable value

A randomly determined reward may never, through any chain of conversions, become a
withdrawable cash balance.

**Why:** paying money for a randomised outcome that can be converted back to money is
gambling in most jurisdictions, with licensing requirements attached. This rule keeps
Collection War on the correct side of that line by construction rather than by policy.

## E9. Real-money withdrawal stays disabled

`FEATURE_REAL_MONEY_WITHDRAWAL_ENABLED` defaults to `false` and remains `false` until legal
review, payment-provider onboarding, KYC/AML obligations and tax handling are all complete.

While it is off, **no code path may create a withdrawable balance** — not "create it but
hide it". A dormant balance that becomes withdrawable when a flag flips is the same
liability, deferred.

See [ADR-0023](../adr/ADR-0023-no-real-money-withdrawal.md).

## E10. Marketplace assets are escrowed

When a listing is created, the asset moves to escrow. Consequences, all of them intended:

- the seller cannot use, consume or re-list an item that is for sale;
- a purchase transfers from escrow, so there is no window where ownership is ambiguous;
- a cancellation returns it, auditably.

## E11. Invariants are executable

Every rule here that _can_ be a test _is_ a test, in
`packages/economy/src/invariants.ts`. A rule that lives only in a document is a hope; one
that fails a build is a rule.

Currently enforced: transfer balances · no kind mixing · integer amounts · non-negative
entry amounts · idempotency-key uniqueness · conservation across transfers.

## E12. Reconciliation is a scheduled job, not an incident response

Summing every entry per currency across all accounts must yield zero. This runs on a
schedule, and a non-zero result pages a human.

**Why scheduled:** an economy bug found by a reconciliation job on day one is a bug. The
same bug found by a player on day ninety is an incident, a rollback, and a trust problem.

---

## Reviewer checklist

Any pull request touching currency, inventory, ownership, rewards or the marketplace:

- [ ] Balance changes go through ledger entries — no direct assignment anywhere.
- [ ] All amounts are integer minor units.
- [ ] Currency kinds are not mixed in any transfer.
- [ ] The whole operation is inside one transaction.
- [ ] Isolation level is appropriate (`SERIALIZABLE` for the listed operations).
- [ ] An idempotency key is required and enforced by a unique constraint.
- [ ] Authorization is re-checked server-side; ownership is not inferred from the request.
- [ ] An audit record is written, with the actor.
- [ ] Tests cover the success path, insufficient funds, concurrent access, and a retry.
- [ ] No path allows a random reward to become withdrawable value.
- [ ] Real-money withdrawal remains disabled.

Related: [Security rules](SECURITY_RULES.md) · [Economy domain](../domains/economy/README.md) ·
[Marketplace domain](../domains/marketplace/README.md)
