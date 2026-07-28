# ADR-0022: Ledger-first economy architecture

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

> Together with [ADR-0005](ADR-0005-modular-monolith.md), the decision most of the system's
> integrity rests on.

## Context

Collection War has a player marketplace. Players will trade, accumulate wealth, and dispute
outcomes. Currency will be granted by quests, battles, expeditions and administrators, and
spent on crafting, progression and purchases.

The obvious implementation — a `balance` column, updated on each operation — has a specific
and fatal set of properties:

- **No history.** "Where did my 5000 gold go?" becomes a guess.
- **Invisible bugs.** A double-granted reward looks identical to a legitimate one.
- **Nothing to reconcile.** Value can be created or destroyed with no detectable trace.

## Decision

**Balances are derived from an append-only, double-entry ledger. No code writes a balance.**

- Every movement debits at least one account and credits at least one other, summing to zero
  per currency. `assertBalanced` refuses to write anything else.
- Entries are **immutable**. A mistake is corrected with a compensating entry.
- Amounts are **integer minor units**. Never floats.
- Currency **kinds** (`SOFT`, `PREMIUM`, `PROMO`, `FIAT`) never mix within a transfer.
- Every economy write carries an **idempotency key**, enforced by a database unique index.
- **Reconciliation runs on a schedule**: the sum across all accounts per currency must be
  zero.
- A cached balance column is permitted **only** as an optimisation derived from and
  reconcilable against the entries.

Six invariants are **executable** and unit-tested in `packages/economy/src/invariants.ts`.

## Alternatives considered

**A mutable balance column with a separate transaction log.** Simpler, faster reads, and what
most games do. Rejected: the balance and the log can disagree, and when they do there is no
principled way to decide which is right. The whole point is that there is exactly one truth.

**Event sourcing for the entire system.** The ledger is already event-sourced, so extending
it everywhere is consistent. Rejected: it multiplies complexity for domains that do not need
it, and event sourcing a player's nickname buys nothing.

**Single-entry ledger** (a list of deltas per account). Better than a mutable balance.
Rejected: without a counterparty there is no conservation invariant, so value created from
nothing is undetectable — which is the exact failure mode that matters most.

**A specialised ledger database.** Rejected: it reintroduces cross-system atomicity. The
ledger must commit in the same transaction as the ownership transfer.

## Positive consequences

- **Complete, immutable financial history.** Every question about a balance is answerable.
- **Conservation is checkable.** A non-zero reconciliation total proves value was created or
  lost, and points at when.
- Duplication is detectable — two entries sharing an idempotency key.
- Corrections are auditable, because they are entries rather than edits.
- The type system enforces currency-kind separation before runtime does.
- The structure is familiar to anyone who has seen double-entry accounting.

## Negative consequences

- **More writes.** Every movement writes at least two rows plus a transfer record.
- **Balance computation is a sum**, which grows with a player's history. Mitigated by a
  reconcilable cache.
- `ledger_entries` is the fastest-growing table in the system and never shrinks.
- Every economy operation is more code than `balance -= cost`.
- Developers unfamiliar with double entry need to learn it.

## Risks

- **The cached balance diverging** from the entries. Mitigated by continuous reconciliation —
  and by the entries always being authoritative when they disagree.
- A developer bypassing the ledger "just this once". Mitigated by the domain interface having
  no method that assigns a balance, by review, and by the rule being stated in the
  [economy integrity rules](../constitution/ECONOMY_INTEGRITY_RULES.md).
- Table growth. Mitigated by time partitioning and archival — never deletion.

## Review conditions

- Reconciliation reports a non-zero total → **stop and investigate**. This is not a
  performance issue; it means value moved without a counterparty.
- Ledger volume requires partitioning → partition; do not simplify the model.
- **Any proposal to introduce a directly mutable balance requires a new ADR and owner
  approval.**
