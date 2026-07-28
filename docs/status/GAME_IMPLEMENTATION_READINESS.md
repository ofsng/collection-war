# Game Implementation Readiness

> **Date: 2026-07-28.** Perishable.
> Audience: anyone about to implement gameplay. Produced by Phase 0 of
> [CW-0100](../tasks/active/CW-0100-game-architecture-and-first-vertical-slice.md).

---

## Verdict

**Ready to implement the first vertical slice**, after three corrections that Phase 0 made,
and with one limitation that cannot be removed on this machine.

---

## Verified repository state

Every line below was produced by running a command, not by reading a document.

| Check                   | Result                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Branch / commits        | `main`, 2 commits, working tree clean                                                |
| Remote                  | `origin` → `github.com/ofsng/collection-war.git` (**exists — nothing pushed by me**) |
| Node                    | v22.16.0 (via `nvm use`; machine default is still v18)                               |
| pnpm                    | 10.11.0                                                                              |
| **Docker**              | **still NOT AVAILABLE**                                                              |
| Documentation           | 112 markdown files, 24 ADRs                                                          |
| `pnpm lint`             | ✅                                                                                   |
| `pnpm typecheck`        | ✅                                                                                   |
| `pnpm test`             | ✅ 237                                                                               |
| `pnpm build`            | ✅                                                                                   |
| `pnpm check:docs`       | ✅                                                                                   |
| **`pnpm format:check`** | ❌ **FAILED** at baseline — see C1                                                   |

---

## Corrections made in Phase 0

### C1 — The baseline was not green, contrary to what CW-0002 claimed

`CW-0002` states: _"Platform baseline is 100% verified (`pnpm verify` green)."_

**It was not.** `pnpm format:check` failed on `apps/web/next-env.d.ts` and
`apps/admin/next-env.d.ts`.

**Cause.** Next.js generates those files on every build and stamps them "should not be
edited". Prettier rewrites their double quotes to single quotes; the next build rewrites them
back. The gate therefore fails after every build, for files nobody edits — which is precisely
how a team learns to ignore a red quality gate.

**Fix.** Added `.prettierignore`. `pnpm verify` is now green.

**Why this matters beyond the fix:** a stale "verified" claim in a task packet is the failure
mode the repository's own rules are written against. The claim has been corrected here rather
than left to be discovered later.

### C2 — The brief describes the API stack incorrectly

The instructions describe `apps/api` as a **"Fastify backend API"** and instruct: _"Do not
replace Fastify with NestJS."_

**The repository already uses NestJS 11 on the Fastify 5 adapter**
([ADR-0008](../adr/ADR-0008-nestjs-fastify-api.md)) — verified in `apps/api/package.json`:
`@nestjs/core`, `@nestjs/platform-fastify`.

There is nothing to replace and nothing to preserve differently. **NestJS stays, Fastify stays
— they are the same stack.** No ADR amendment is required; the brief's description was simply
inaccurate. Recorded so nobody later "restores" a bare-Fastify server that never existed.

### C3 — `packages/battle-engine` has no ruleset versioning yet

The brief lists "battle ruleset versioning" as an existing capability. What exists is
`BATTLE_ENGINE_VERSION` (a single constant, currently `0.0.0`) and `canReplay()`, which
honestly returns `false` for anything else.

**A versioned, data-driven ruleset does not exist.** It is specified in Phase 1 and built in
the slice.

---

## The limitation that cannot be removed here

**Docker is still unavailable.** But Phase 0 found a way around most of its consequences.

### PGlite: real PostgreSQL, no Docker

Drizzle ships a driver for [PGlite](https://pglite.dev) — PostgreSQL compiled to WASM,
running in-process. Verified by spike:

```text
PostgreSQL 18.3 (PGlite 0.5.4) on wasm32-unknown-linux-gnu
CHECK constraint enforced          ✓
UNIQUE constraint enforced         ✓   ← the double-spend protection
transaction rollback works         ✓
SERIALIZABLE accepted              ✓
```

This converts the largest risk in [RISKS.md](RISKS.md#r1--local-infrastructure-has-never-been-started--high)
from "unverifiable" to "mostly verifiable". Integration tests can now run in CI and on any
machine, with no Docker.

**What PGlite still cannot prove.** It is a **single-connection** engine. Genuine concurrent
behaviour — two transactions racing for the same row, a real `40001` serialization failure,
the retry path in `createUnitOfWork` — **cannot be tested on it.** Those still require real
PostgreSQL.

So the honest position is:

| Property                            | PGlite | Needs real Postgres |
| ----------------------------------- | ------ | ------------------- |
| Schema, constraints, indexes        | ✅     |                     |
| Transaction commit / rollback       | ✅     |                     |
| Unique-index idempotency            | ✅     |                     |
| Query correctness                   | ✅     |                     |
| **Concurrent double-spend**         | ❌     | ✅                  |
| **`SERIALIZABLE` conflict + retry** | ❌     | ✅                  |
| Connection-pool behaviour           | ❌     | ✅                  |

Recorded as [ADR-0025](../adr/ADR-0025-pglite-for-integration-tests.md). The Docker-based
compose file remains the reference environment, and the concurrency tests stay written and
gated.

---

## Architecture gaps found

What genuinely does not exist yet, and is required before or during the slice:

| Gap                                               | Needed for      | Phase       |
| ------------------------------------------------- | --------------- | ----------- |
| Game architecture package (10 documents)          | All gameplay    | 1           |
| Domain specifications (identity → progression)    | All gameplay    | 1           |
| **Authentication of any kind**                    | Everything      | Slice       |
| Authorization enforcement                         | Everything      | Slice       |
| Any game database table                           | Everything      | Slice       |
| Versioned battle ruleset + real combat            | Battle          | Slice       |
| Content pipeline (species, materials, encounters) | Battle, rewards | Slice       |
| Rate limiting                                     | Security        | After slice |
| Outbox relay worker                               | Events          | After slice |

## Contradictions found and resolved

| #   | Contradiction                                                                                       | Resolution                                                                       |
| --- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | CW-0002 claims a green baseline; `format:check` failed                                              | Fixed the cause; corrected the claim (C1)                                        |
| 2   | Brief says "Fastify backend, do not replace with NestJS"; repo is NestJS-on-Fastify                 | Brief inaccurate; no change (C2)                                                 |
| 3   | Brief says ruleset versioning exists; only a version constant does                                  | Build it in the slice (C3)                                                       |
| 4   | Brief mandates `CW-0100`; `CW-0002` already covers Phase 1 specs                                    | CW-0100 **absorbs** CW-0002; CW-0002 marked superseded rather than duplicated    |
| 5   | Brief lists 60 species / 80 materials for release; also forbids building them before the loop works | No conflict — release scope ≠ slice scope. Slice ships 3 species and 4 materials |

## Unresolved ADRs

- [ADR-0023](../adr/ADR-0023-no-real-money-withdrawal.md) — `Proposed`. **Does not block the
  slice**; the slice touches no currency at all.

## Implementation blockers

**None for the slice.** Two items would block later phases:

1. Real PostgreSQL for concurrency tests — blocks the **marketplace** and **economy** phases,
   not this slice.
2. Product-vision confirmation — the slice implements mechanics that follow from the brief
   directly, so it is safe to proceed; broader scope decisions still need an owner.

## Security risks entering the slice

| Risk                     | Handling in the slice                                                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No authentication exists | The slice **implements** it: scrypt hashing, JWT access + rotating refresh                                                                                                                                                  |
| Password hashing choice  | `AUTHENTICATION_MODEL.md` specifies Argon2id; the slice uses **scrypt** from `node:crypto` to avoid a native dependency. Deviation recorded in [ADR-0026](../adr/ADR-0026-scrypt-password-hashing.md) with a migration path |
| Client-authored rewards  | Battle resolution, rewards and level-up are all server-side; the client sends intent only                                                                                                                                   |
| Reward replay            | Idempotency keys on every reward-granting write, enforced by the existing unique index                                                                                                                                      |
| Ownership forgery        | Ownership re-verified inside the transaction on every mutation                                                                                                                                                              |

## Economy risks entering the slice

**The slice deliberately touches no currency.** Rewards are experience and materials only, so
the ledger is not exercised and cannot be got wrong here.

Materials are still treated with economy discipline — transactional, idempotent, with
append-only history — because they convert into creature value later.

## Recommended resolution order

1. ✅ Fix the baseline (C1)
2. ✅ Record the stack and capability contradictions (C2, C3)
3. ✅ Unblock integration testing (ADR-0025)
4. Phase 1 — architecture package + VS-001 specification
5. Phase 2 — implement the slice
6. Then, and only then, Phase 3

---

Related: [CW-0100](../tasks/active/CW-0100-game-architecture-and-first-vertical-slice.md) ·
[CURRENT_STATE.md](CURRENT_STATE.md) · [RISKS.md](RISKS.md)
