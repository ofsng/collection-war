# Workflow: `/economy-review`

> **MANDATORY** for any change touching currency, inventory, ownership, rewards or the
> marketplace. There is no version of this that is optional.

**Canonical:** [Economy integrity rules](../../docs/constitution/ECONOMY_INTEGRITY_RULES.md)
— all twelve.

## Why it is mandatory

An economy bug:

- **cannot be quietly fixed** — players saw the balance, and taking it back is worse than the
  bug;
- **compounds** — duplicated value spreads through the marketplace within hours, and every
  subsequent trade is built on it;
- **is often invisible** — a slow leak looks like inflation until the currency is worthless;
- **may be a legal matter** where real money is involved.

## The checklist

- [ ] **Balance changes go through ledger entries.** No direct assignment, anywhere
- [ ] **Integer minor units** throughout — no floats
- [ ] **Currency kinds not mixed** in any transfer
- [ ] **One transaction**, or none of it
- [ ] `SERIALIZABLE` isolation for a listed operation
- [ ] **Idempotency key**, enforced by a database unique constraint — not an application check
- [ ] **A retry returns the original result — tested**
- [ ] **Concurrent access tested**
- [ ] Audit record written, with the actor
- [ ] No path from a random reward to withdrawable value
- [ ] **Real-money withdrawal still disabled**
- [ ] Reconciliation would detect this operation failing
- [ ] **The relevant invariant exists as an executable test**

## The four questions

Require answers, not reassurance:

1. **What is the maximum value extractable per hour by a determined attacker?**
2. What happens if every request is retried ten times?
3. What happens if two arrive simultaneously?
4. **Would reconciliation detect this? How quickly?**

## Faucets and sinks

Every economy change is one, the other, or both. State which:

- **Faucet** — how much value enters, per player, per unit time? What caps it?
- **Sink** — how much leaves? Is it enough to offset the faucets?

An unintended faucet is an inflation bug. An unintended sink is a trust bug.

## Output

**Approve** or **reject**. Never "looks fine".

**"It probably works" is a rejection.**

For a rejection: which rule is violated, why it matters, and what specifically must change.

## When you find a new failure mode

**Add the invariant** to `packages/economy/src/invariants.ts`, as an executable test.

A rule that lives only in a document is a hope. One that fails a build is a rule. Every
economy incident should leave behind a test that would have caught it.

## Escalate to the owner

Any new faucet or sink · any change to reward values · anything touching `FIAT` · any
proposal to relax an invariant.
