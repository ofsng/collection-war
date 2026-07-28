# Domain: Economy

> **Tier 1 — Critical.** The strictest domain in the project.
> Status: **PRIMITIVES IMPLEMENTED, domain not implemented.** Date: 2026-07-28.
> Covers domain concerns 19 (economy and ledgers) and 21 (rewards).

## 1. Purpose

Own all value in the game: currency balances, every movement between them, and every reward
grant.

Rewards live here rather than in their own domain because **a reward IS a ledger movement**.
Separating them would put one invariant in two places, and the two would eventually disagree.

## 2. Responsibilities

- Ledger accounts (player wallets, escrow, platform revenue, faucets, sinks).
- Recording every value movement as balanced, immutable entries.
- Computing balances by summing entries.
- Escrow holds and releases for the marketplace.
- Granting rewards, exactly once.
- Reconciliation.

## 3. Owned data

| Table             | Holds                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `ledger_accounts` | Account type, optional `player_id`, currency                                                            |
| `ledger_entries`  | **Immutable, append-only**: transfer id, account, direction, amount, reason, reference, idempotency key |
| `reward_grants`   | Which reward was granted to whom, for what, with which key                                              |
| `balance_cache`   | Optional denormalised balance — **derived, reconcilable, never authoritative**                          |

## 4. Public interface

```text
getBalance(playerId, currency) → Result<Money>
transfer(from, to, amount, reason, reference, idempotencyKey, tx) → Result<TransferId>
grant(playerId, amount, reason, reference, idempotencyKey, tx) → Result<TransferId>
spend(playerId, amount, reason, reference, idempotencyKey, tx) → Result<TransferId>
holdInEscrow(playerId, amount, reference, idempotencyKey, tx) → Result<TransferId>
releaseEscrow(escrowRef, toPlayerId, idempotencyKey, tx) → Result<TransferId>
grantReward(playerId, reward, sourceRef, idempotencyKey, tx) → Result<RewardResult>
reconcile(currency) → Result<ReconciliationReport>
```

Every mutating method takes a **transaction context** and an **idempotency key**. Neither is
optional, and the signature is what makes that non-negotiable rather than a convention.

## 5. Incoming dependencies

`marketplace` · `quests` · `pve` · `arena` · `exploration` · `habitats` · `crafting` ·
`progression` · `administration`

Essentially everything that can change a player's wealth.

## 6. Outgoing dependencies

`audit` · `player-profile` (the account owner exists)

Deliberately minimal. The economy must be verifiable without understanding the game.

## 7. Domain events

`Economy.TransferRecorded` · `Economy.RewardGranted` · `Economy.EscrowHeld` ·
`Economy.EscrowReleased` · `Economy.ReconciliationFailed`

`ReconciliationFailed` is the one that pages a human. It means value has been created or
destroyed without a counterparty.

## 8. Security concerns

The highest-value target in the system.

- **Balance forgery.** There is no code path that writes a balance. Balances are derived.
- **Double spending.** Idempotency enforced by a **database unique index**, never by an
  application check-then-insert — that is a race, and the race is a double spend.
- **Race conditions.** Concurrent spends against the same balance run at `SERIALIZABLE`.
- **Negative balances.** Structurally impossible: `spend` refuses, and a balance is a sum of
  entries the invariants keep non-negative.
- **Currency-kind laundering.** `checkNoCurrencyKindMixing` rejects any transfer that would
  convert `PROMO` into `PREMIUM`, or anything into `FIAT`.
- **Admin abuse.** Administrative adjustments require a role, a justification and an audit
  record naming the actor.
- **Reward duplication.** A duplicated event must not grant twice; consumers are idempotent
  and `reward_grants` is keyed.

## 9. Economy concerns

This domain _is_ the economy concern. All twelve
[economy integrity rules](../../constitution/ECONOMY_INTEGRITY_RULES.md) apply here first.

Reconciliation deserves particular emphasis: summing every entry per currency across all
accounts must yield **zero**. Anything else means value entered or left without a
counterparty.

That job runs on a schedule, not in response to a complaint. An economy bug found by
reconciliation on day one is a bug; the same bug found by a player on day ninety is an
incident, a rollback and a trust problem.

## 10. Expected scaling pressure

`ledger_entries` is the fastest-growing table in the system — every reward, purchase, sale
and craft writes to it.

- Balance computation by summing grows with a player's history → cache the balance, keep the
  entries authoritative, reconcile continuously.
- Partition by time once volume justifies it. Entries are append-only and time-ordered, so
  this is natural.
- Never delete entries to save space. They are the records.

## 11. What this domain must never do

- **Never assign a balance.** Only append entries.
- **Never update or delete a ledger entry.** Correct with a compensating entry.
- **Never move value outside a transaction.**
- **Never accept a client-supplied amount.**
- **Never mix currency kinds in one transfer.**
- **Never use floating-point arithmetic.**
- **Never allow an unbalanced transfer to be written** — `assertBalanced` runs first.
- **Never grant a reward without an idempotency key.**
- **Never create a withdrawable balance** while
  [E9](../../constitution/ECONOMY_INTEGRITY_RULES.md#e9-real-money-withdrawal-stays-disabled)
  holds.
- **Never let a random reward convert into withdrawable value.**

## Bootstrap status

`packages/economy` implements, with 30 passing tests:

- exact integer arithmetic — `add`, `subtract`, `spend`, `multiply`, `applyBasisPoints`,
  `split`, `compare` — every one returning `Result`;
- the ledger contract: accounts, entries, transfers, repository interface;
- six executable invariants: transfer balances · no kind mixing · integer amounts ·
  non-negative amounts · idempotency-key uniqueness · conservation;
- `assertBalanced`, which refuses to write an unbalanced transfer.

There are **no** currencies, prices, reward tables or fees — those are game design, and
inventing them here would be exactly the premature implementation this bootstrap prevents.

Related: [Marketplace](../marketplace/) · [Audit](../audit/) ·
[Economy integrity rules](../../constitution/ECONOMY_INTEGRITY_RULES.md)
