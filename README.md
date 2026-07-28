# Collection War

A creature collection, battle and marketplace game. Web, Android and iOS, one authoritative
backend, Turkish and English from day one.

> ## Current state: development platform only
>
> **No gameplay is implemented, deliberately.** This repository contains a verified
> development platform — architecture, boundaries, tooling, documentation and application
> shells. Gameplay begins after the domain specification package is approved
> ([CW-0002](docs/tasks/BACKLOG.md)).
>
> See [CURRENT_STATE.md](docs/status/CURRENT_STATE.md) for what is verified, what is
> unverified, and what does not exist.

---

## Quick start

```bash
nvm use          # Node 22.16.0 — Node 18 is EOL and will not work
pnpm install
cp .env.example .env
pnpm infra:up    # PostgreSQL, Redis, MinIO, Mailpit — requires Docker
pnpm db:migrate
pnpm dev
```

| Service  | URL                        |
| -------- | -------------------------- |
| Web      | http://localhost:3000      |
| Admin    | http://localhost:3001      |
| API      | http://localhost:4000      |
| API docs | http://localhost:4000/docs |
| Mailpit  | http://localhost:8025      |

Full setup and troubleshooting: [Local development](docs/runbooks/LOCAL_DEVELOPMENT.md).

---

## Documentation

**[`docs/`](docs/README.md) is the source of truth.** Start there.

| If you are…                   | Read                                                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| New here                      | [Architecture overview](docs/architecture/ARCHITECTURE_OVERVIEW.md) → [Domain map](docs/domains/DOMAIN_MAP.md)                    |
| About to write code           | [Engineering principles](docs/constitution/ENGINEERING_PRINCIPLES.md) → [Dependency rules](docs/architecture/DEPENDENCY_RULES.md) |
| An AI agent                   | [AI agent rules](docs/constitution/AI_AGENT_RULES.md) — **mandatory**                                                             |
| Asking "why is it like this?" | [ADRs](docs/adr/README.md)                                                                                                        |
| Asking "what state is it in?" | [Current state](docs/status/CURRENT_STATE.md)                                                                                     |

---

## Structure

```text
apps/
├── api/        NestJS on Fastify — the only authority
├── workers/    BullMQ background processing
├── web/        Next.js — player-facing
├── admin/      Next.js — administration
└── mobile/     Expo / React Native

packages/       13 shared packages — domain, economy, battle-engine, database, …
docs/           canonical documentation
infrastructure/ Docker Compose and deployment assets
scripts/        cross-platform tooling
```

Each app and package has its own README stating its responsibility, its interface, and
**what it may not depend on**.

---

## The ideas the code is built around

**The server decides everything that matters.** Battle outcomes, rewards, balances,
ownership, prices, anything time-gated. The client renders and requests.
([ADR-0024](docs/adr/ADR-0024-server-authoritative-state.md))

**Balances are derived, never assigned.** The economy is a double-entry, append-only ledger
with six executable invariants and scheduled reconciliation.
([ADR-0022](docs/adr/ADR-0022-ledger-first-economy.md))

**Dependencies point inward.** Domain packages know nothing of HTTP, SQL or React — which is
why economy invariants and battle determinism are unit tests rather than integration tests.
([Dependency rules](docs/architecture/DEPENDENCY_RULES.md))

**Outcomes are reproducible.** No `Date.now()` and no `Math.random()` in domain code —
injected clock, seeded randomness, recorded seed. A disputed battle can be replayed.

**A modular monolith, deliberately.** One deployable process, strict internal boundaries.
Transactions work; extraction stays possible.
([ADR-0005](docs/adr/ADR-0005-modular-monolith.md))

**Turkish is not an afterthought.** It is the default locale, and catalogue completeness is a
failing test.

---

## Commands

```bash
pnpm verify     # THE GATE: format → lint → typecheck → test → build
pnpm dev
pnpm test
pnpm check:env  # diagnose a broken setup
pnpm infra:up | down | logs | status
```

`pnpm verify` is the minimum bar for calling work complete.

---

## Verified, and not

**Verified by execution:**
237 tests pass · `pnpm verify` green · the API serves health, readiness and system info over
HTTP · dependency boundary rules reject deliberate violations · web and admin build.

**Not verified:**
Docker was unavailable on the bootstrap machine, so local infrastructure has never been
started, no migration has ever run, and integration tests have never executed. The mobile app
has never run on a device. CI has never executed.

Full detail, with the exact commands: [Bootstrap report](docs/status/BOOTSTRAP_REPORT.md).

---

## Contributing

Read [engineering principles](docs/constitution/ENGINEERING_PRINCIPLES.md) and the
[security rules](docs/constitution/SECURITY_RULES.md) first. Anything touching currency,
inventory or ownership additionally requires the
[economy integrity rules](docs/constitution/ECONOMY_INTEGRITY_RULES.md).

Work is tracked in [task packets](docs/tasks/README.md). Decisions become
[ADRs](docs/adr/README.md).

---

## License

Proprietary — see [LICENSE](LICENSE). The choice is deliberately restrictive by default and
is tracked as an [open decision](docs/status/OPEN_DECISIONS.md).
