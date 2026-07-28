# Deferred Work

> **Date: 2026-07-28.** Perishable.
> Audience: anyone wondering whether something was forgotten. **It was not.**

Work deliberately **not** done during the bootstrap, with the reason and the trigger for doing
it. Distinct from [technical debt](TECHNICAL_DEBT.md) — that is work done in a way that will
need redoing; this is work not started.

---

## Blocked by the environment

Docker was unavailable on the bootstrap machine. These are **ready to run**, not designed.

| Work                                                     | Trigger          |
| -------------------------------------------------------- | ---------------- |
| Start local infrastructure and verify every health check | Docker installed |
| Generate and apply the first migration                   | Docker installed |
| Run the six integration tests                            | Docker installed |
| Verify `SERIALIZABLE` behaviour and transaction rollback | Docker installed |
| Verify MinIO bucket initialisation                       | Docker installed |

**These are the highest-value items in this document.** They convert claims into facts.

---

## Deferred deliberately

### Gameplay — everything

No creature systems, battle logic, marketplace, economy operations, exploration, habitats,
PvE, PvP, progression, quests, collection, content or balance.

**Why:** every rule that is expensive to add later — transactional integrity, idempotency,
audit, determinism — is cheap to design in and costly to retrofit. Implementing before the
specifications exist is how those get skipped.

**Trigger:** [CW-0002](../tasks/BACKLOG.md) approved.

### Authentication and authorization enforcement

**Why:** it is a domain with a threat model, not a utility to be improvised. Building it badly
first is worse than not building it.

**Trigger:** CW-0002.

### Rate limiting

**Why:** nothing to protect and no traffic. It is a small piece of work once there is
authentication to protect.

**Trigger:** with authentication.

### The outbox relay worker

The table, the contract, the retry policy and the backoff are all built. **The relay is not.**

**Why:** nothing publishes an event yet.

**Trigger:** the first domain that publishes one. It will be the first job processor.

### Content Security Policy for the web application

**Why:** a CSP written before the application has real assets is either so permissive it does
nothing, or so strict it breaks the first feature that adds an image. Other headers are set.

**Trigger:** before production.

### E2E tests

Playwright is configured. **Zero tests exist.**

**Why:** there is one screen, and it is covered by component tests. An E2E test of a health
screen would test the harness.

**Trigger:** the first real user journey.

### Mobile on-device testing

**Why:** rendering React Native under Vitest tests a simulation of React Native. Real coverage
needs Maestro or Detox plus CI that can run an emulator.

**Trigger:** before the first release.

### Unified design tokens across DOM and native

Mobile mirrors the palette, with a test asserting the values match.

**Why:** the correct fix is either a separate tokens package or a subpath export, and both
have consequences worth deciding deliberately. See [D8](OPEN_DECISIONS.md).

**Trigger:** before the palette grows.

### Type-aware linting

**Why:** slower, and needs a project-service configuration across 19 projects. See
[D7](OPEN_DECISIONS.md).

### Monitoring, metrics, tracing, alerting

**Why:** nothing deployed to observe. Structured logging and correlation ids exist from day
zero precisely because those are painful to retrofit; a collector is not.

**Trigger:** a hosted environment, then real traffic.

### Deployment pipelines

**Why:** an automatic production deploy is a loaded weapon. Written before there is somewhere
to deploy, a tested rollback and monitoring, it is untested automation pointed at production.

**Trigger:** all of the prerequisites in
[DEPLOYMENT_ARCHITECTURE.md](../architecture/DEPLOYMENT_ARCHITECTURE.md).

### Backups

**Why:** no hosted database to back up. The **requirements** are written, so they are not
invented during an incident.

**Trigger:** the first hosted database. **And a restore must be executed**, not just
configured — an untested backup is a hypothesis.

### EAS Build and store submission

**Why:** an account-level action with cost implications, explicitly out of scope.

### Push notifications

**Why:** needs developer accounts and credentials. The notification domain is designed so a
channel is a delivery adapter, not a redesign.

### Remote feature flags · A/B testing · data warehouse · CDN · read replicas

**Why:** each is a response to a measurement that does not exist yet. See
[COST_STRATEGY.md](../architecture/COST_STRATEGY.md).

---

## Explicitly not deferred — these are non-goals

Microservices · Kubernetes · a message broker · multi-cloud · offline play · real-time
multiplayer · a desktop client · crypto or NFTs · a plugin system.

These are **decisions**, not postponements. See [non-goals](../product/NON_GOALS.md).

---

Related: [Technical debt](TECHNICAL_DEBT.md) · [Open decisions](OPEN_DECISIONS.md) ·
[Backlog](../tasks/BACKLOG.md)
