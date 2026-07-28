# Current State

> **Date: 2026-07-28.** This document is perishable — treat anything here as stale unless the
> date is recent.
> Audience: anyone about to plan work, human or AI. **Read this before assuming anything
> exists.**

---

## In one paragraph

Collection War has a **verified development platform** and **no gameplay**. The monorepo
installs, 237 tests pass, `pnpm verify` is green, the API serves health and readiness over
real HTTP, and the architectural boundary rules have been proven to reject violations. Local
infrastructure is fully configured but **has never been started**, because Docker was not
available on the bootstrap machine — so no migration has run, no integration test has
executed, and the mobile app has never run on a device.

---

## Verified by execution

Each of these was confirmed by running a command and observing the result.

| Item                                 | Evidence                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Monorepo installs                    | `pnpm install` → 19 projects, 54s, exit 0                                                                |
| **All quality gates pass**           | `pnpm verify` → format ✅ lint ✅ typecheck ✅ test ✅ build ✅                                          |
| 237 tests pass                       | 167 package · 28 API · 13 web · 4 admin · 13 mobile · 12 worker                                          |
| **API runs and serves HTTP**         | `GET /health` → 200 · `/api/v1/system/info` → 200 · `/ready` → **503 with dependencies down, correctly** |
| Security headers applied             | CSP, `X-Frame-Options`, `nosniff` observed on a live response                                            |
| Correlation id echoed                | `x-correlation-id` returned on the response                                                              |
| Error envelope                       | 404 returned the standard `{ error: { category, code, message } }` shape                                 |
| OpenAPI served                       | `/docs` → 200                                                                                            |
| **Boundary rules reject violations** | 4 deliberate violations introduced; all 4 rejected                                                       |
| Web and admin build                  | `next build` → success, both                                                                             |
| Mobile typechecks and tests          | `tsc --noEmit` ✅ · 13 logic tests ✅                                                                    |

---

## Exists but NOT verified

| Item                              | Why not                                    | Consequence                                                                  |
| --------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| **Local infrastructure**          | Docker not installed                       | Health checks, MinIO init and the PostgreSQL locale setting are all untested |
| **Database migrations**           | No database to run against                 | The generate → review → apply cycle has never been exercised                 |
| **Integration tests** (6 written) | Need PostgreSQL                            | `SERIALIZABLE` behaviour and the transaction rollback are unproven           |
| **CI workflows**                  | No Git remote                              | Never executed                                                               |
| **Mobile on a device**            | No device, no emulator, no interactive TTY | It has never rendered a single frame                                         |
| Redis connectivity                | No Redis running                           | Only unit-tested with injected fakes                                         |

---

## Does not exist

Stated plainly, because absence is easy to misread as "somewhere I have not looked".

**Gameplay** — no creature, battle, marketplace, economy, exploration, habitat, PvE, PvP,
progression, quest or collection feature. No game content of any kind.

**Authentication** — no login anywhere. The admin guard denies every role, with a test
asserting it.

**Authorization enforcement** — the model is designed; nothing enforces it.

**Rate limiting** · **the outbox relay worker** (or any job processor) · **any game database
table** · **E2E tests** · **any deployment, environment, or hosted resource** · **any
monitoring or alerting** · **any cost incurred**.

---

## What is built, precisely

### Applications

| App       | State                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`     | Health, readiness, system info. Config validation, structured logging, error filter, correlation interceptor, OpenAPI. **Verified running.** |
| `workers` | Startup, Redis connection, queue declarations, graceful shutdown. **Zero processors.**                                                       |
| `web`     | Health screen, locale switching, error boundary, loading state.                                                                              |
| `admin`   | A route guard that denies everything, plus a health panel.                                                                                   |
| `mobile`  | Health screen, locale switching, SecureStore adapter. **Never run.**                                                                         |

### Packages

All 13 build, typecheck and test. Notably:

- **`economy`** — exact integer arithmetic, the ledger contract, and **six executable
  invariants** (30 tests). No currencies, prices or reward tables.
- **`battle-engine`** — contract, versioning and **seven written invariants** (6 tests). No
  combat logic, and a test that fails if gameplay symbols appear.
- **`domain`** — repository interfaces, events, outbox contract, unit of work, deterministic
  clock and seeded random (15 tests).
- **`database`** — pool, transactions with isolation control and serialization retry, health
  probe. Two **platform** tables (`outbox`, `idempotency_keys`); no game schema.

### Documentation

Complete: constitution (6) · product (6) · architecture (16 + diagrams) · domains (21 + map +
shared kernel) · **24 ADRs** · specification templates (5) · runbooks (9) · security (6) ·
status (7).

### AI adapters

`CLAUDE.md` + `.claude/` (12 rules, 10 agents, 3 commands) · `agents.md` + `.agents/`
(11 workflows). Both are thin pointers to `docs/` per
[ADR-0018](../adr/ADR-0018-ai-tool-adapter-strategy.md).

---

## Environment requirements

| Tool                 | Required                    | On the bootstrap machine                                                    |
| -------------------- | --------------------------- | --------------------------------------------------------------------------- |
| Node                 | **22.16.0** (`.nvmrc`)      | Available via nvm; **default is 18 (EOL)** — `nvm use` required every shell |
| pnpm                 | >= 10.11.0                  | 10.11.0 ✅                                                                  |
| **Docker + Compose** | Required for infrastructure | **NOT INSTALLED**                                                           |
| Playwright browsers  | For E2E                     | Not downloaded                                                              |

---

## The next task

**[CW-0002](../tasks/BACKLOG.md) — the canonical architecture and domain specification
package.** No gameplay implementation begins before it is approved.

Two things block confident progress and are worth doing first:

1. **Run `pnpm infra:up`** on a machine with Docker, and confirm the stack works.
2. **Confirm or replace the product vision** — it was inferred, not provided, and is marked
   unapproved.

---

Related: [Bootstrap report](BOOTSTRAP_REPORT.md) · [Risks](RISKS.md) ·
[Open decisions](OPEN_DECISIONS.md) · [Deferred work](DEFERRED_WORK.md) ·
[Technical debt](TECHNICAL_DEBT.md)
