# Open Decisions

> **Date: 2026-07-28.** Perishable.
> Audience: the owner, and anyone about to make one of these decisions by accident.

Decisions that are **genuinely unresolved**. Each has a default currently in force, chosen to
be safe rather than to be right — because an unmade decision still has to behave somehow.

**Making one of these by accident, in an implementation, is the failure mode this document
prevents.**

---

## D1 — Is the inferred product model correct? · **Owner** · **Blocking**

[Product vision](../product/PRODUCT_VISION.md),
[principles](../product/PRODUCT_PRINCIPLES.md), [MVP scope](../product/MVP_SCOPE.md) and
[non-goals](../product/NON_GOALS.md) were **derived from the domain structure**, not provided.

**Current default:** treated as unapproved, and marked so on every document.

**Why it matters:** the architecture was optimised for a product model nobody has confirmed.
If the marketplace is not player-to-player, or the economy is not central, several expensive
decisions were made for the wrong reasons.

**Needed:** an hour of the owner's time. Confirm, correct, or replace.

---

## D2 — Real-money withdrawal · **Owner + legal** · **Blocking for monetisation**

[ADR-0023](../adr/ADR-0023-no-real-money-withdrawal.md) is `Proposed`, not `Accepted`,
deliberately: it has legal consequences an engineering bootstrap is not competent to accept.

**Current default:** disabled, enforced at four levels — a flag defaulting to false, a rule
that no code path may create a withdrawable balance, the `FIAT` currency-kind barrier, and the
random-reward prohibition.

**Needed:** legal review, then an explicit written decision. The eight-item checklist in the
ADR must be complete before the flag can move.

---

## D3 — License · **Owner**

**Current default:** proprietary, all rights reserved.

Chosen because an unlicensed public repository grants no rights at all, and a permissive
license **cannot be revoked once published**. Restrictive-by-default is the reversible option.

**Needed:** a deliberate choice before any external distribution.

---

## D4 — Styling strategy for web and admin · **Web**

**Current default:** inline style objects in the design system. Zero dependencies, identical
behaviour in server components and tests.

**Why it is open:** this does not scale to a real visual design — no theming, no media
queries, no pseudo-selectors. The alternatives (CSS Modules, Tailwind, a CSS-in-JS runtime)
each have real trade-offs, and choosing before there is a design would be choosing blind.

**Needed:** a visual design first. Then decide.

---

## D5 — Hosting provider · **Owner**

**Current default:** none, and [cloud-neutral](../adr/ADR-0019-cloud-neutral-architecture.md)
so the choice stays open. Multi-cloud is **not** the goal — the goal is that lock-in is a
decision rather than an accident.

A container platform with managed PostgreSQL and Redis (Render, Railway, Fly, Hetzner, a
major cloud) all fit the current architecture.

**Needed:** a decision when a hosted environment is actually required, with a new ADR
recording the lock-in accepted.

---

## D6 — TypeScript 7.x · **Engineering**

**Current default:** pinned to 5.9.3. TypeScript 7 exists but the lint and build ecosystem is
not yet aligned, and a bootstrap is the wrong moment to be first to find out.

**Needed:** re-evaluate once typescript-eslint and the build toolchain support it.

---

## D7 — Type-aware linting · **Engineering**

**Current default:** syntax-aware only (`typescript-eslint` recommended, not
`recommendedTypeChecked`).

**Trade-off:** type-checked rules catch a genuinely valuable class of bug — floating promises,
unsafe `any` propagation, misused `await` — but they are slower and need a project-service
configuration across 19 projects.

**Needed:** a decision on whether the lint-time cost is worth it. Recorded in
[technical debt](TECHNICAL_DEBT.md).

---

## D8 — Unifying design tokens across DOM and native · **Web + mobile**

**Current default:** `apps/mobile/src/lib/config.ts` mirrors the palette, with a test
asserting the values match.

**Options:** a separate `design-tokens` package (a 14th package) · a subpath export from the
design system (which needs bundler-style resolution everywhere) · accepting the duplication.

**Needed:** a decision before the palette grows. Duplication of five colours is manageable;
duplication of a full design system is not.

---

## D9 — Client generation from OpenAPI · **Engineering**

**Current default:** the API client is hand-written.

**Trade-off:** generation removes drift, but a generated client is only as good as the
annotations, and hand-writing keeps the error handling and idempotency semantics explicit.

**Needed:** revisit when the endpoint count makes hand-writing the cost.

---

## D10 — Analytics destination · **Product**

**Current default:** events are typed and validated; there is no destination. They would be
stored in PostgreSQL.

**Needed:** a decision when there is data worth analysing. The contract is designed so the
destination is a late choice.

---

## How to close one

1. Gather what is actually needed to decide — usually less than it feels.
2. Write an [ADR](../adr/README.md) with the alternatives and **why each lost**.
3. Update this document: remove the entry, link the ADR.
4. Update anything that referenced the default.

**Do not close a decision by implementing one option quietly.** That is how a default becomes
permanent without anyone choosing it.

---

Related: [ADR index](../adr/README.md) · [Risks](RISKS.md) ·
[Deferred work](DEFERRED_WORK.md)
