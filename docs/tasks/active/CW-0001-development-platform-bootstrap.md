# CW-0001: Development platform bootstrap

- **Status:** **Partially complete** — remains in `active/` until B1 is done
- **Owner / agent:** Claude Code (`claude-opus-5`)
- **Created:** 2026-07-28
- **Updated:** 2026-07-28

---

## Objective

Establish the complete development foundation for Collection War: canonical architecture,
documentation, domain boundaries, reproducible local development, AI-agent operating rules,
security and economy baselines, and minimal application shells — **without implementing any
gameplay.**

## Business reason

Every rule that is expensive to add later — transactional integrity, idempotency, audit
trails, determinism, localization completeness, boundary discipline — is cheap to design in
and costly to retrofit.

Building the platform first, deliberately and separately, is what makes those cheap.

## Context

Started from an **empty directory**, on a Linux Mint machine with a Turkish locale, Node 18
as the default (EOL), nvm providing 22.16.0, and **no Docker**.

No product brief, design document or research was provided. The product model had to be
inferred from the requested domain structure, and is marked unapproved throughout.

## Scope

Monorepo · 5 applications · 13 packages · full documentation system · 24 ADRs · AI adapters
for two tools · local infrastructure configuration · quality gates · CI foundations ·
minimal application shells.

## Non-goals

**No gameplay of any kind** — no creature systems, battle logic, marketplace, economy
operations, exploration, habitats, PvE, PvP, balance, or seed data. No creature or material
content.

No paid infrastructure, cloud account, domain or deployment. No microservices, Kubernetes or
message broker. No game database schema. No pushing to a remote. No `.cursorrules`. No
installing Obsidian.

## Related domains

All 21 are **documented**. None is implemented.

## Related ADRs

All 24 were written as part of this task. [ADR-0023](../../adr/ADR-0023-no-real-money-withdrawal.md)
is `Proposed`, not `Accepted` — it has legal consequences an engineering bootstrap cannot
accept.

## Relevant documentation

[BOOTSTRAP_ENVIRONMENT.md](../../status/BOOTSTRAP_ENVIRONMENT.md) ·
[BOOTSTRAP_REPORT.md](../../status/BOOTSTRAP_REPORT.md) ·
[CURRENT_STATE.md](../../status/CURRENT_STATE.md)

## Allowed files

The entire repository — it was empty.

## Forbidden files

Anything outside `/home/ofsng/Projects/collection-war`. Any file containing a real secret. No
`.env` was committed.

## Dependencies

None.

## Assumptions

Each one was recorded because being wrong about it would explain a failure:

1. **The product model inferred from the domain list is broadly right.** ← the largest
   assumption, and unverified. See [R2](../../status/RISKS.md).
2. Docker will be available on a development machine eventually.
3. Turkish and English are the only locales for the foreseeable future.
4. Node 22 is acceptable as the floor.
5. A small team, so tooling favours throughput over process.
6. The economy is central enough to justify ledger-first from day one.

## Acceptance criteria

| #   | Criterion                              | Result                                                   |
| --- | -------------------------------------- | -------------------------------------------------------- |
| 1   | Canonical documentation exists         | ✅ 109 documents                                         |
| 2   | Architecture documents are substantive | ✅ 16 + diagrams                                         |
| 3   | Domain map exists                      | ✅ 21 domains, all 30 concerns mapped                    |
| 4   | Initial ADRs exist                     | ✅ 24                                                    |
| 5   | `docs/` opens as an Obsidian vault     | ✅ standard Markdown, no plugin syntax, no wikilinks     |
| 6   | Claude Code adapters exist             | ✅                                                       |
| 7   | Antigravity adapters exist             | ✅ 11 workflows                                          |
| 8   | Adapters do not duplicate architecture | ✅ pointers only                                         |
| 9   | Monorepo installs                      | ✅ 19 projects, 54.3s                                    |
| 10  | Imports resolve                        | ✅ typecheck passes                                      |
| 11  | **API health endpoint works**          | ✅ **verified over HTTP**                                |
| 12  | Web can reach the API                  | ✅ verified in component tests against a stubbed `fetch` |
| 13  | Mobile passes available validation     | ✅ typecheck + lint + 13 tests                           |
| 14  | Admin passes available validation      | ✅ typecheck + lint + 4 tests + builds                   |
| 15  | Worker builds and passes validation    | ✅ typecheck + 12 tests                                  |
| 16  | Local infrastructure configured        | ✅ configured — ❌ **never started**                     |
| 17  | Environment variables validated        | ✅ 14 tests                                              |
| 18  | Formatting passes                      | ✅                                                       |
| 19  | Linting passes                         | ✅ zero errors, zero warnings                            |
| 20  | Type checking passes                   | ✅                                                       |
| 21  | Tests pass                             | ✅ **237**                                               |
| 22  | Build passes                           | ✅                                                       |
| 23  | No gameplay implemented                | ✅ two tests enforce it                                  |
| 24  | No paid infrastructure                 | ✅ zero cost                                             |
| 25  | Task packet complete                   | ✅ this document                                         |
| 26  | Status documents updated               | ✅ 7                                                     |
| 27  | No unsupported completion claims       | ✅                                                       |

**26 of 27 met. Criterion 16 is the reason this is partially complete.**

## Required tests

| Level              | Status                                          |
| ------------------ | ----------------------------------------------- |
| Unit               | ✅ 237 passing                                  |
| Integration        | ⚠️ **6 written, never executed** — needs Docker |
| E2E                | ⚠️ harness configured, **no tests written**     |
| Economy invariants | ✅ 6 invariants, 30 tests                       |

## Security considerations

Implemented and tested: log redaction (deny-by-default, 11 tests) · configuration validation
with production-strict rules (14 tests) · the global error filter never returning internal
detail (tested) · correlation-id validation against log injection (tested) · the admin guard
**denying every role** (tested) · dependency boundaries (verified against deliberate
violations).

**Not implemented:** authentication · authorization enforcement · rate limiting · CSP for web.

## Economy considerations

Primitives implemented and tested (30 tests): exact integer arithmetic returning `Result` ·
the double-entry ledger contract · six executable invariants · `assertBalanced` refusing to
write an unbalanced transfer.

**No currencies, prices, fees or reward tables** — those are game design.

## Localization considerations

`tr-TR` and `en`, complete for the shells, with **catalogue completeness as a failing test**.
No user-facing string is hardcoded in any application, with two commented exceptions in
`apps/web` that must render even when the locale provider is what failed.

## Accessibility considerations

Semantic elements throughout · every control labelled · focus never removed · status never
conveyed by colour alone · 44pt touch targets on mobile · safe-area insets respected · loading
and error states announced.

## Performance considerations

Cursor pagination · UUIDv7 keys · `Intl` formatter caching · bounded and parallel health
checks · Turborepo caching. No premature optimisation beyond design-level choices that would
be expensive to reverse.

---

## Decisions made

24 ADRs. The consequential ones:

| Decision                    | ADR                                                       | Note                                   |
| --------------------------- | --------------------------------------------------------- | -------------------------------------- |
| Modular monolith            | [0005](../../adr/ADR-0005-modular-monolith.md)            | Transactions are the deciding factor   |
| Ledger-first economy        | [0022](../../adr/ADR-0022-ledger-first-economy.md)        | Balances derived, never assigned       |
| Server-authoritative        | [0024](../../adr/ADR-0024-server-authoritative-state.md)  | The foundation everything else assumes |
| Deterministic battle engine | [0015](../../adr/ADR-0015-deterministic-battle-engine.md) | Lint-enforced                          |
| No real-money withdrawal    | [0023](../../adr/ADR-0023-no-real-money-withdrawal.md)    | **`Proposed`** — needs legal review    |
| Thin AI adapters            | [0018](../../adr/ADR-0018-ai-tool-adapter-strategy.md)    | One source of truth                    |

**Two decisions made during execution, both recorded in the ADRs they affect:**

- **`eslint-plugin-boundaries` was removed** after a probe showed it was reporting nothing.
  Replaced with `no-restricted-imports`, then verified against four deliberate violations.
- **jsdom pinned to 29.1.1** rather than upgrading the developer's global Node installation —
  the bootstrap should not mutate the machine's toolchain.

## Escalations

None during execution. Three raised for the owner:
[D1](../../status/OPEN_DECISIONS.md#d1--is-the-inferred-product-model-correct--owner--blocking)
(product model),
[D2](../../status/OPEN_DECISIONS.md#d2--real-money-withdrawal--owner--legal--blocking-for-monetisation)
(real-money withdrawal),
[D3](../../status/OPEN_DECISIONS.md#d3--license--owner) (license).

## Commands executed

Full list with real output: [BOOTSTRAP_REPORT.md](../../status/BOOTSTRAP_REPORT.md).

```text
$ pnpm verify
  PASS  format:check   3.3s
  PASS  lint           2.1s
  PASS  typecheck      7.2s
  PASS  test           4.6s
  PASS  build          8.1s
✔ verify passed.

$ pnpm infra:up
✖ Docker (with the Compose plugin) is required and was not found.
```

## Results

**405 files, 109 of them documentation. 237 tests passing. `pnpm verify` green. The API
verified over real HTTP. Dependency boundaries proven against deliberate violations.**

Eleven failures occurred during execution and were fixed; two were **real platform defects**
(the API client capturing `fetch` at construction, and the readiness body being discarded on
503), both of which now have regression tests. All eleven are listed in the report.

## Remaining work

**Blocked (needs Docker):** start infrastructure · generate and apply the first migration ·
run the integration tests · verify `SERIALIZABLE` and rollback behaviour.

**Blocked (needs the owner):** confirm the product model · decide ADR-0023 · decide the
license · approve a Git remote.

**Not started, deliberately:** all gameplay — [CW-0002](../BACKLOG.md).

## Handoff summary

The platform is built and verified to the limit of what the machine allowed.

**Do these three things first**, in order:

1. `nvm use` — the default Node is 18 and nothing works on it.
2. Install Docker, then `pnpm infra:up && pnpm db:generate && pnpm db:migrate &&
pnpm test:integration`. This converts the largest set of unverified claims into facts.
3. Spend an hour confirming or replacing the product vision. It was inferred, and the
   architecture was optimised for it.

**Then** CW-0002 — the specification package. **Do not start gameplay before it is approved.**

**A warning:** `docs/status/*` documents state what is unverified. When B1 is done, several of
them become wrong in the opposite direction. Update them, and resist the temptation to remove
a limitation that still applies.

---

## Completion checklist

- [x] 26 of 27 acceptance criteria met; the one that is not is named
- [x] `pnpm verify` passes, with its real output recorded
- [x] Documentation complete
- [x] Status documents updated
- [x] **No unsupported completion claim anywhere**
- [ ] **Moved to `completed/`** — deliberately not, until
      [B1](../BACKLOG.md) verifies local infrastructure
