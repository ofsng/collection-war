# Rule: Economy

**Canonical:** [ECONOMY_INTEGRITY_RULES.md](../../docs/constitution/ECONOMY_INTEGRITY_RULES.md)
— read all twelve rules before touching value ·
[economy domain](../../docs/domains/economy/) ·
[ADR-0022](../../docs/adr/ADR-0022-ledger-first-economy.md)

---

> **The strictest rules in this project.** An economy bug cannot be quietly fixed, it
> compounds through the marketplace within hours, it is often invisible until it is large,
> and it may be a legal matter.

## The five that stop most bugs

1. **Never assign a balance.** Append ledger entries. There is no code path anywhere that
   writes `wallet.balance = x`.
2. **Integers only.** Whole minor units. `0.1 + 0.2 !== 0.3`, and in a ledger that difference
   is real value appearing.
3. **Every transfer balances**, per currency, to zero. `assertBalanced` refuses anything else.
4. **Currency kinds never mix.** `SOFT` · `PREMIUM` · `PROMO` · `FIAT` are not
   interchangeable — that separation is the barrier between gameplay currency and real money.
5. **Idempotency key on every write**, enforced by a **database unique index**. An
   application check-then-insert is a race, and the race is a double spend.

## Also

- One transaction, or none of it
- `SERIALIZABLE` for the listed operations
- Ledger entries are **append-only** — correct with a compensating entry, never an edit
- Marketplace assets are **escrowed**
- A random reward may **never** become withdrawable value
- **Real-money withdrawal stays disabled** — [ADR-0023](../../docs/adr/ADR-0023-no-real-money-withdrawal.md)
- Admin adjustments obey the same rules. **No privileged bypass.**

## Before submitting an economy change

Run the
[economy reviewer checklist](../../docs/constitution/ECONOMY_INTEGRITY_RULES.md#reviewer-checklist).

Then answer:

- What is the maximum value extractable per hour by a determined attacker?
- What happens if every request is retried ten times?
- What happens if two arrive simultaneously?
- **Would reconciliation detect this failing? How quickly?**

## Every economy rule that can be a test, is one

`packages/economy/src/invariants.ts` — six executable invariants, 30 tests.

**When you find a new failure mode, add the invariant.** A rule that lives only in a document
is a hope; one that fails a build is a rule.

## Escalate

Any change to currency, ownership or inventory semantics. Any new faucet or sink. Any change
to reward values. These are not code reviews — they are economy decisions.
