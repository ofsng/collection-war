# CW-0002: Canonical architecture and domain specification package

- **Status:** In progress
- **Owner / agent:** Opus 5 / Antigravity
- **Created:** 2026-07-28
- **Updated:** 2026-07-28

---

## Objective

Produce and approve the complete, canonical specification package for Collection War in `docs/specifications/modules/` covering all MVP domains, data models, state machines, economy ledger contracts, security threat models, and authorization matrices before any gameplay code implementation begins.

## Business reason

Every rule that is expensive to add later — transactional integrity, idempotency, audit trails, determinism, localization completeness — is cheap to design in and costly to retrofit. Completing the specifications first ensures every constraint is explicit, reviewable, and testable before writing code.

## Context

Task CW-0001 established the initial platform bootstrap (405 files, 19 monorepo projects, 237 passing tests). The domain map (`docs/domains/`) defines 21 domains covering 30 concerns, but these are high-level intentions. Task CW-0002 bridges the gap between high-level domain concepts and precise implementation specifications.

## Scope

For each MVP domain (Shared Foundations, Identity & Profile, Creature Catalog & Owned Creatures, Progression, Battle Engine & PvE, Inventory & Exploration, Economy Ledger, Marketplace, Arena & Quests, Administration & Audit):

1. **Domain Models & Aggregates:** Explicit invariants, state transitions, and validation rules.
2. **Data Specs:** Entity-relationship definitions, Drizzle schemas, indexes, constraints, and migration strategies.
3. **Battle Engine Spec:** State machine design, random seed management, determinism contract.
4. **Economy Ledger Spec:** Accounts, faucets, sinks, double-entry ledger rules, non-negative balance invariants.
5. **Marketplace Spec:** Escrow patterns, order book / listing model, fee structures, settlement flow.
6. **Authorization Matrix:** Operations mapped to role requirements (`player`, `admin`, `system`).
7. **Threat & Anti-Cheat Models:** Rate limits, transaction replay prevention, payload validation, secret isolation.

## Non-goals

- No gameplay code implementation (TypeScript/Next.js/React Native).
- No actual creature balance numbers or final asset creation.
- No production database deployments.

## Related domains

All 21 domains in `docs/domains/`.

## Related ADRs

- [ADR-0005: Modular Monolith](../../adr/ADR-0005-modular-monolith.md)
- [ADR-0015: Deterministic Battle Engine](../../adr/ADR-0015-deterministic-battle-engine.md)
- [ADR-0022: Ledger-First Economy](../../adr/ADR-0022-ledger-first-economy.md)
- [ADR-0024: Server-Authoritative State](../../adr/ADR-0024-server-authoritative-state.md)

## Relevant documentation

- `docs/specifications/README.md`
- `docs/specifications/templates/`
- `docs/tasks/BACKLOG.md`
- `docs/status/CURRENT_STATE.md`

## Allowed files

- `docs/specifications/modules/**`
- `docs/tasks/active/CW-0002-canonical-architecture-and-domain-specifications.md`
- `docs/tasks/BACKLOG.md`
- `docs/tasks/README.md`
- `docs/status/*`

## Forbidden files

- `apps/**`
- `packages/**`
- `infrastructure/**`

## Dependencies

- CW-0001 (Completed & verified baseline platform)

## Assumptions

1. The domain breakdown in `docs/domains/DOMAIN_MAP.md` is valid for MVP.
2. Economy balance is strictly derived from immutable double-entry ledger entries.
3. Node 22 (`v22.16.0`) is used for all scripts and checks.

## Acceptance criteria

- [x] CW-0002 task packet created and registered in `docs/tasks/active/`
- [ ] Specification files generated in `docs/specifications/modules/<domain>/` using repository templates
- [ ] Shared foundations (Auth matrix, error catalog, content versioning) specified
- [ ] Economy ledger specification complete (accounts, faucets, sinks, invariants)
- [ ] Marketplace spec complete with escrow and settlement rules
- [ ] Battle engine specification complete with determinism guarantees
- [ ] `pnpm check:docs` and `pnpm verify` pass cleanly

## Required tests

| Level              | What must be covered                                       |
| ------------------ | ---------------------------------------------------------- |
| Unit               | N/A (Documentation phase)                                  |
| Integration        | N/A (Documentation phase)                                  |
| E2E                | N/A (Documentation phase)                                  |
| Economy invariants | Stated formally in spec documents for implementation phase |

## Security considerations

Authorization matrix, secret isolation, rate limiting rules, payload validation specs.

## Economy considerations

Formal specs for double-entry ledger, faucets, sinks, escrow, zero-sum verification.

## Localization considerations

Catalog structures for localized messages in specifications.

---

## Decisions made

| Decision                            | Reasoning                                                         | ADR? |
| ----------------------------------- | ----------------------------------------------------------------- | ---- |
| Use modular specification structure | Each domain gets its own folder in `docs/specifications/modules/` | No   |

## Commands executed

```text
$ pnpm format
PASS
$ pnpm verify
✔ verify passed.
```

## Results

Task CW-0002 prepared as active task packet. Platform baseline is 100% verified (`pnpm verify` green).

## Handoff summary

The platform is in a clean, fully verified state. Task CW-0002 is registered in `docs/tasks/active/`. Opus 5 can immediately start generating module specifications under `docs/specifications/modules/`.
