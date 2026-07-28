# ADR-0023: No real-money withdrawal at initial release

- **Status:** **Proposed** — requires owner approval and legal review
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap (provisional)

> **Marked `Proposed`, not `Accepted`, deliberately.** This decision has legal consequences
> that an engineering bootstrap is not competent to accept on the project's behalf. Recording
> it honestly is the point of the status field.

## Context

Collection War has a player marketplace with a real ledger, escrow and seller balances. That
machinery is structurally close to a system where players could cash out.

The moment players can convert in-game value to real money, a set of obligations attaches
that has nothing to do with software:

- **Money transmission / payment services** licensing, which varies by jurisdiction.
- **KYC and AML**: identity verification, transaction monitoring, reporting.
- **Tax**: withholding, reporting, and issuing documents to players.
- **Consumer protection**: refunds, chargebacks, dispute resolution.
- **Gambling regulation** — the most serious. In many jurisdictions, paying money for a
  randomised outcome that can be converted back to money is gambling, with licensing
  requirements attached.
- **App store policies**, which are stricter than the law in several places.

## Decision

**Real-money withdrawal is disabled and remains disabled** until legal review, payment
provider onboarding, KYC/AML capability and tax handling are all complete.

Enforced at four levels:

1. **A feature flag**, `FEATURE_REAL_MONEY_WITHDRAWAL_ENABLED`, defaulting to `false`. Flags
   [fail closed](../../packages/configuration/src/feature-flags.ts) — a flag-resolution
   failure disables the feature rather than enabling it.
2. **No code path may create a withdrawable balance** while the flag is off. Not "create it
   but hide it" — a dormant balance that becomes withdrawable when a flag flips is the same
   liability, deferred.
3. **A structural barrier**: `FIAT` is a separate currency kind, and
   `checkNoCurrencyKindMixing` rejects any transfer that would convert a gameplay currency
   into it.
4. **A rule**: a randomly determined reward may never, through any chain of conversions,
   become a withdrawable cash balance
   ([E8](../constitution/ECONOMY_INTEGRITY_RULES.md#e8-random-rewards-never-become-withdrawable-value)).

The MVP ships with `SOFT` currency only — no real-money exposure at all.

## Alternatives considered

**Enable withdrawal at launch.** A genuine differentiator, and attractive to players.
Rejected: it requires licensing, KYC/AML and tax capability that do not exist, and getting it
wrong is not a bug — it is a legal problem that can end the project.

**Withdrawal in permissive jurisdictions only.** Rejected: it requires reliable jurisdiction
determination, which requires KYC, which is most of the work anyway — plus per-jurisdiction
legal review.

**Cryptocurrency or an NFT marketplace.** Rejected outright and listed as a
[non-goal](../product/NON_GOALS.md). It does not avoid the regulation; it adds volatility, a
different regulatory regime, and reputational cost.

**Build the withdrawal machinery now, behind the flag.** Rejected: unused financial code is
untested financial code, and its existence invites someone to enable it before the
obligations are met.

## Positive consequences

- **No licensing, KYC/AML or tax obligation** during development and testing.
- A clean position with app stores.
- The economy can be tested with real players at essentially zero legal risk.
- The ledger machinery is proven before real money touches it — which is the right order.
- The gambling question does not arise, by construction.

## Negative consequences

- A monetisation avenue is unavailable, and it may be one players want.
- Marketplace value is confined to the game, which limits how compelling trading feels.
- Some competitors may offer it.
- Enabling it later is substantial work, not a flag flip.

## Risks

- **The main risk is drift**: a feature that "almost" allows cash-out, or a promotional
  mechanic that effectively does. Mitigated by the currency-kind separation being a type-level
  and invariant-level barrier rather than a policy.
- Regulatory interpretation of the _in-game_ marketplace alone. Even without cash-out, a
  marketplace with randomised acquisition may attract scrutiny in some jurisdictions.
  **This needs legal input, and this ADR does not resolve it.**

## Review conditions

Revisit **only** when all of these are true:

- [ ] Legal review completed for every target jurisdiction.
- [ ] A payment provider is onboarded and its requirements understood.
- [ ] KYC/AML capability exists and has been tested.
- [ ] Tax withholding and reporting are handled.
- [ ] Consumer-protection processes exist: refunds, chargebacks, disputes.
- [ ] App-store policy compliance is confirmed.
- [ ] The economy has run without a reconciliation failure for a sustained period.
- [ ] **The owner has explicitly approved**, in writing.

Until every box is ticked, the flag stays `false`.
