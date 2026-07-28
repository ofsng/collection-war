# Backlog

> Date: 2026-07-28. Ordered. Anything not here is not next.

---

## Immediately blocking

These are not features. They are gaps that make claims about the platform unverifiable.

### B1 — Verify the local infrastructure actually works

**Blocked on:** Docker not installed on the bootstrap machine.

`docker-compose.yml` is written and reviewed but has **never been started**. Its health
checks, the MinIO bucket initialisation and the PostgreSQL locale setting are all unverified.

Until someone runs `pnpm infra:up` and sees every service healthy, the local infrastructure
is designed, not proven.

```bash
pnpm infra:up && pnpm db:generate && pnpm db:migrate && pnpm test:integration
```

### B2 — Confirm or replace the product vision

[Product vision](../product/PRODUCT_VISION.md), [principles](../product/PRODUCT_PRINCIPLES.md)
and [MVP scope](../product/MVP_SCOPE.md) were **inferred from the domain structure**, not
provided. They are marked unapproved.

Building against an unconfirmed product model is how a year of work ends up serving nobody.
This needs an hour of the product owner's time and is worth more than anything below it.

---

## CW-0002 — Canonical architecture and domain specification package

> **The required next task.** No gameplay implementation begins before this is approved.

**Objective.** Produce and approve the complete specification package for Collection War,
before any gameplay code is written.

**Why this comes first.** Every rule that is expensive to add later — transactional
integrity, idempotency, audit trails, determinism, localization completeness — is cheap to
design in and costly to retrofit. This is where they get decided while they are still cheap,
and where somebody other than the implementer can disagree.

The [domain documents](../domains/) state boundaries and intentions. They are deliberately
**not detailed enough to implement from**.

**Scope.** For each MVP domain, produce and approve:

- full domain models and aggregates, with invariants stated precisely enough to test;
- database entity relationships, indexes, constraints and migration plans;
- the battle-engine state machine and its determinism guarantees;
- economy ledger design: accounts, faucets, sinks, reconciliation;
- marketplace escrow and settlement flow;
- inventory transaction semantics;
- creature generation rules;
- progression, evolution and star development;
- API contracts per domain;
- WebSocket contracts, if any;
- domain events with versions and consumers;
- background jobs and their schedules;
- the authorization matrix — every operation, every role;
- threat models for identity, marketplace and economy;
- the anti-cheat model;
- the content versioning and localization content model;
- backup and recovery procedures;
- scaling thresholds and cost projections;
- the test strategy per domain.

**Explicitly out of scope.** Any implementation. Any creature or material content. Any
gameplay code.

**Definition of done.** Every document uses the
[templates](../specifications/templates/), lives in
`docs/specifications/modules/<domain>/`, and is marked **Approved**.

**Suggested order** — each depends on the previous:

1. Shared foundations: authorization matrix, error catalogue, content versioning
2. Identity + player profile
3. Data model for the MVP domains
4. Creature catalogue + owned creatures + progression
5. Battle engine + PvE
6. Inventory + exploration
7. **Economy ledger** ← the one that must be right
8. Marketplace on top of the ledger
9. Arena, quests, notifications
10. Administration + audit

---

## After CW-0002

Only after the relevant specification is approved.

| #       | Task                                                          | Depends on       |
| ------- | ------------------------------------------------------------- | ---------------- |
| CW-0003 | Identity implementation: registration, verification, sessions | CW-0002          |
| CW-0004 | Authorization enforcement across the API                      | CW-0003          |
| CW-0005 | Rate limiting                                                 | CW-0003          |
| CW-0006 | Outbox relay worker — **the first real job processor**        | B1               |
| CW-0007 | Player profile                                                | CW-0003          |
| CW-0008 | Creature catalogue + content versioning                       | CW-0002          |
| CW-0009 | Owned creatures + ownership transfer                          | CW-0008          |
| CW-0010 | Economy ledger implementation                                 | CW-0002, B1      |
| CW-0011 | Battle engine implementation                                  | CW-0002          |
| CW-0012 | Marketplace with escrow                                       | CW-0009, CW-0010 |

---

## Platform work, in parallel

Independent of the specification phase. See
[deferred work](../status/DEFERRED_WORK.md) for the full list.

| Task                                                      | Why it matters                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| Run the mobile app on a device or emulator                | It has **never been run**. Only typechecked, linted and unit-tested. |
| Exercise the CI workflows                                 | Written but never executed — a GitHub remote is required             |
| Download Playwright browsers and write the first E2E test | The harness exists; no test does                                     |
| Content Security Policy for the web application           | Deliberately deferred; required before launch                        |
| Unify design tokens across DOM and native                 | Mobile currently mirrors the palette                                 |
| Type-aware linting                                        | Currently syntax-aware only                                          |
| Backup and restore procedure, **executed**                | An untested backup is a hypothesis                                   |

---

## Not next, and why

| Not doing                    | Reason                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| Any gameplay implementation  | Blocked on CW-0002. This is the whole point of the bootstrap. |
| Creature or material content | Content design, and it must not be invented by an engineer    |
| Real-money features          | [ADR-0023](../adr/ADR-0023-no-real-money-withdrawal.md)       |
| Deployment pipelines         | Nothing to deploy to; an untested deploy is worse than none   |
| Microservice extraction      | [ADR-0005](../adr/ADR-0005-modular-monolith.md)               |
| Monitoring stack             | No traffic to observe                                         |

Related: [Task packets](README.md) · [MVP scope](../product/MVP_SCOPE.md) ·
[Deferred work](../status/DEFERRED_WORK.md)
