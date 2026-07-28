# CW-0100: Game architecture and first playable vertical slice

- **Status:** Phases 0–2 complete; **partially complete overall** (14 of 16 acceptance criteria)
- **Owner / agent:** Claude Code (`claude-opus-5`)
- **Created:** 2026-07-28
- **Updated:** 2026-07-28
- **Supersedes:** [CW-0002](CW-0002-canonical-architecture-and-domain-specifications.md)

---

## Objective

Complete the canonical **game** architecture package, specify the first playable loop, and
implement it end to end — register → choose locale → choose a starter → build a team → fight a
server-authoritative battle → receive rewards → level up → see the same state on another
client.

## Business reason

The platform is verified but proves nothing about the game. Until one complete loop works
end to end, every architectural claim — determinism, server authority, transactional
integrity, cross-client sync — is a claim about documents rather than about a running system.

One thin working loop de-risks the remaining twenty.

## Context

CW-0001 delivered the platform (237 tests, `verify` green). CW-0002 planned the specification
package but produced only its own packet.

Phase 0 of this task found and fixed three problems, recorded in
[GAME_IMPLEMENTATION_READINESS.md](../../status/GAME_IMPLEMENTATION_READINESS.md):

- the baseline was **not** green (`format:check` failed on generated Next.js files);
- the brief describes the API as "Fastify" and warns against NestJS — the repository is
  **NestJS on Fastify**, and that is correct as-is;
- battle "ruleset versioning" did not exist beyond a version constant.

It also unblocked integration testing without Docker, via PGlite.

## Scope

**Phase 1 — architecture and specification**

Ten architecture documents (`GAME_ARCHITECTURE`, `GAME_STATE_OWNERSHIP`,
`DOMAIN_EVENT_CATALOG`, `BACKGROUND_JOB_CATALOG`, `AUTHORIZATION_MATRIX`,
`CONTENT_VERSIONING`, `RANDOMNESS_AND_REPLAY`, `TRANSACTION_BOUNDARIES`, `GAME_CLIENT_SYNC`,
`ANTI_CHEAT_ARCHITECTURE`) plus the slice specification `CW-VS-001-FIRST-PLAYABLE-LOOP.md`.

**Phase 2 — the slice**

Identity · player profile · locale persistence · 3 starter species · starter selection ·
owned creatures · teams · a versioned deterministic battle ruleset with real combat · one
Crimson Rift tutorial encounter · server-authoritative battle actions · rewards (experience +
materials) · material inventory · one level-up · web UI · mobile UI · API client · both
locales · tests at every level.

## Non-goals

**Not in this task**, and not to be added opportunistically:

Evolution · stars · potential · personalities · variations · bond · care · habitats ·
exploration · crafting · marketplace · arena · quests · the economy ledger · currency of any
kind · social features · the remaining 57 species · the remaining 76 materials · biomes 2–4 ·
chapters 2–20 · the admin content UI · rate limiting · the outbox relay worker · WebSockets.

Each is architected in Phase 1 where it constrains the slice, and built later.

## Related domains

`identity` · `player-profile` · `creature-catalog` · `owned-creatures` · `progression` ·
`battle` · `pve` · `inventory`

## Related ADRs

Existing: [0005](../../adr/ADR-0005-modular-monolith.md) ·
[0008](../../adr/ADR-0008-nestjs-fastify-api.md) ·
[0010](../../adr/ADR-0010-drizzle-orm.md) ·
[0015](../../adr/ADR-0015-deterministic-battle-engine.md) ·
[0020](../../adr/ADR-0020-transactional-outbox.md) ·
[0024](../../adr/ADR-0024-server-authoritative-state.md)

New in this task:
[0025 — PGlite for integration tests](../../adr/ADR-0025-pglite-for-integration-tests.md) ·
[0026 — scrypt password hashing](../../adr/ADR-0026-scrypt-password-hashing.md) ·
[0027 — asynchronous arena for the first release](../../adr/ADR-0027-asynchronous-arena.md)

## Allowed files

`docs/architecture/**` · `docs/specifications/**` · `docs/adr/**` · `docs/status/**` ·
`docs/tasks/**` · `packages/**` · `apps/**` · `.prettierignore`

## Forbidden files

`infrastructure/**` (no infrastructure change is needed) · `.github/workflows/**` (CI has
never run; changing it unverified adds risk) · anything creating a paid resource.

## Dependencies

CW-0001. Phase 0 of this task.

## Assumptions

1. **The inferred product model is close enough for the slice.** The slice implements
   mechanics stated directly in the brief, so it does not depend on the unapproved parts.
2. PGlite behaves like PostgreSQL for schema, constraints and single-connection transactions.
   **Verified by spike.** It does not cover concurrency — stated, not assumed.
3. Node 22.16.0 for everything.
4. Placeholder art is acceptable; no system may be blocked on assets.

## Acceptance criteria

Mirrors §51 of the brief.

- [ ] Registration and login; server-side authentication
- [ ] Locale chosen, persisted server-side, shared by web and mobile
- [ ] No hardcoded user-facing text
- [ ] Three starters, localized, exactly one grantable
- [ ] Duplicate starter requests do not grant two creatures
- [ ] Owned creature has a unique instance id, visible on web and mobile
- [ ] Team creation; ownership validated; duplicate slots rejected
- [ ] Server creates the battle, generates the seed, versions the snapshot
- [ ] Actions validated; the client cannot alter health, energy, damage or rewards
- [ ] Battle result is deterministic and replayable
- [ ] Experience and at least one material granted; claims idempotent
- [ ] Inventory history recorded; domain events emitted
- [ ] One valid level-up; invalid level-ups rejected
- [ ] Unit, integration and E2E tests pass
- [ ] `pnpm verify` green; boundaries hold; docs synchronised

## Required tests

| Level                 | Coverage                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                  | Damage, turn order, status, determinism, level curve, reward calculation, auth token handling                                          |
| Property / simulation | Battles terminate; no negative resources; no impossible state                                                                          |
| Integration           | Registration, starter grant (incl. duplicate), team, battle, rewards (incl. replay), level-up — **against real PostgreSQL via PGlite** |
| E2E                   | The full player journey, web                                                                                                           |
| Security              | Unauthorised creature access, reward replay, invalid action, cross-player access                                                       |

## Security considerations

Authentication is new and is the highest-risk surface. Requirements: scrypt with per-user
salt; constant-time comparison; identical responses for existing and non-existing accounts on
register and reset; short-lived access tokens; rotating refresh tokens with reuse detection;
ownership re-verified inside every mutating transaction; a non-owned resource returns 404.

## Economy considerations

**The slice touches no currency, so the ledger is not exercised.** Materials are still
transactional, idempotent and append-only-audited, because they become value later.

## Localization considerations

Every string in both locales. Species names and descriptions are **content keys**, never
identifiers. Catalogue completeness stays a failing test.

## Accessibility considerations

Semantic elements, labelled controls, visible focus, non-colour status, 44pt touch targets,
announced loading and error states.

## Performance considerations

Cursor pagination on creature and inventory lists. No N+1 in the battle path. Content cached
by version.

---

## Decisions made

| Decision                     | Reasoning                                                                                                      | ADR                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| PGlite for integration tests | Real Postgres semantics with no Docker; unblocks the largest risk. Concurrency limits stated                   | [0025](../../adr/ADR-0025-pglite-for-integration-tests.md) |
| scrypt, not Argon2id         | `node:crypto` built-in; avoids a native dependency and a blocked install script. Memory-hard, OWASP-acceptable | [0026](../../adr/ADR-0026-scrypt-password-hashing.md)      |
| Asynchronous arena           | Brief §29 requires the comparison; async is far lower risk for a first release                                 | [0027](../../adr/ADR-0027-asynchronous-arena.md)           |
| CW-0100 absorbs CW-0002      | Two packets covering the same specification work would diverge                                                 | —                                                          |

## Escalations

Three raised for the owner, none blocking the slice: product-model confirmation ·
ADR-0023 (real-money withdrawal) · real PostgreSQL for concurrency verification.

## Commands executed

```text
$ pnpm verify
  PASS  format:check   4.4s
  PASS  lint           3.1s
  PASS  typecheck      4.4s
  PASS  test           3.6s
  PASS  build          6.4s
✔ verify passed.

$ pnpm turbo run test            → 292 unit tests passing, 19 projects
$ pnpm --filter @collection-war/database run test:integration  → 19 passing (real PostgreSQL)
$ pnpm --filter @collection-war/api      run test:integration  → 35 passing (real PostgreSQL)
$ pnpm check:docs                → all checks passed
$ pnpm --filter @collection-war/database exec drizzle-kit generate --name=game_schema
                                 → drizzle/0000_game_schema.sql, 13 tables

$ pnpm infra:up                  → NOT RUN. Docker is still not installed.
$ pnpm test:e2e                  → NOT RUN. No Playwright browsers, no tests written.
```

## Results

**The first playable loop works end to end and is proven by 54 integration tests against real
PostgreSQL.**

| Acceptance criterion                                     | Result                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Registration; server-side authentication                 | ✅ scrypt, tested                                                      |
| Locale chosen, persisted, shared across clients          | ✅ tested                                                              |
| No hardcoded user-facing text                            | ✅ both locales complete; failing test guards it                       |
| Three localized starters                                 | ✅ Koruk, Mizu, Veyra                                                  |
| Exactly one starter, ever                                | ✅ tested **two ways** — idempotency key and a second distinct request |
| Unique instance id, visible on web                       | ✅ web only — **mobile not built**                                     |
| Team creation, ownership validated, duplicates rejected  | ✅ tested                                                              |
| Server creates battle, generates seed, versions snapshot | ✅ tested                                                              |
| Client cannot alter health, energy, damage or rewards    | ✅ **no endpoint accepts them**                                        |
| Deterministic, replayable result                         | ✅ identical across 20 runs; seed and versions stored                  |
| Experience and materials granted; claims idempotent      | ✅ retry grants nothing extra                                          |
| Inventory history recorded; events emitted               | ✅ tested                                                              |
| One valid level-up; invalid rejected                     | ✅ tested                                                              |
| Unit + integration tests pass                            | ✅ 292 + 54                                                            |
| **E2E test passes**                                      | ❌ **not written**                                                     |
| `pnpm verify` green; boundaries hold; docs synchronised  | ✅                                                                     |

**14 of 16 criteria met.** The two that are not:

- **No E2E test.** Playwright is configured; no browsers are installed and no test is written.
  The integration suite covers the same journey at the service layer, which is close but not
  the same thing — it does not exercise the HTTP layer or the browser.
- **Mobile has no game screens.** It still shows only the health screen. The slice is
  therefore **not yet cross-platform in practice**, only in architecture.

### Problems found and fixed during the work

| Problem                                                                                        | Fix                                                                     |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Baseline was not green** — `format:check` failed on generated Next.js files                  | `.prettierignore`                                                       |
| Brief describes the API as "Fastify, do not replace with NestJS" — it is NestJS **on** Fastify | Recorded; nothing changed                                               |
| Battle "ruleset versioning" did not exist                                                      | Built a versioned ruleset register                                      |
| Integration tests had never run                                                                | PGlite ([ADR-0025](../../adr/ADR-0025-pglite-for-integration-tests.md)) |
| `check:docs` guarded against "gameplay implementation" — obsolete once gameplay was approved   | Replaced with a hardcoded-content guard                                 |
| Turkish translations silently missing                                                          | Caught by the completeness test, then added                             |

## Remaining work

**Blocked on Docker:** concurrency verification (two simultaneous grants, real `40001`
retries, pool behaviour) — [R13](../../status/RISKS.md). Required before any economy work.

**Not started:** mobile game screens · E2E tests · the outbox relay worker · rate limiting ·
everything in Phase 3 and beyond.

## Handoff summary

**State:** `pnpm verify` green. 292 unit + 54 integration tests passing. The loop is playable
in the browser. Nothing is committed — the working tree holds the whole change.

**Do these first, in order:**

1. **Mobile game screens.** The API client and every contract already exist, so this is UI
   work rather than design work. Until it is done, "cross-platform" is an architectural claim
   rather than a demonstrated one.
2. **An E2E test** of the loop. `pnpm exec playwright install` first.
3. **The outbox relay worker.** Events are being written to `outbox` and nothing consumes
   them; the backlog grows silently.
4. **Concurrency tests on real PostgreSQL**, before any economy work.

**Warnings for whoever continues:**

- **PGlite is single-connection.** Passing integration tests are _not_ evidence that
  concurrent access is safe. Do not let a green suite stand in for [R13](../../status/RISKS.md).
- The web client holds the refresh token **in memory**, so a page reload signs the player out.
  That is deliberate — the alternative is storing it where JavaScript can read it — and the
  real fix is an `httpOnly` cookie, which is server work.
- Experience currently goes to the **first team member only**. Fine for a one-creature team;
  a real decision is needed for 3v3.
- Repeating a cleared node grants **full** rewards. A known farm, bounded only by there being
  one chapter and no currency.
