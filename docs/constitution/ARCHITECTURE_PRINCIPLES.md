# Architecture Principles

> **Binding.** Changing one requires an [ADR](../adr/README.md).
> Audience: anyone adding a module, a package, a dependency or an infrastructure component.

---

## 1. Modular monolith first, and for a long time

Collection War ships as **one deployable API process** plus **one worker process**, both
built from a monorepo with strict internal boundaries.

Not microservices. See [ADR-0005](../adr/ADR-0005-modular-monolith.md).

The reasoning is specific rather than ideological:

- A marketplace purchase must move currency and ownership atomically. Inside one database,
  that is a transaction. Across services, it is a saga — with compensating actions,
  intermediate states, and an entire class of "the money moved but the item did not" bugs
  that simply cannot occur in the monolith.
- Distributed systems cost distributed debugging. With no players and no traffic, that
  cost buys nothing.
- Service boundaries drawn before the domain is understood are drawn in the wrong places,
  and moving them later is far harder than moving a module.

**The obligation this creates:** module boundaries must be as disciplined as if they were
already service boundaries. A monolith with no internal boundaries is a big ball of mud,
and the only thing worse than premature microservices is a monolith that cannot ever become
them. See [module boundaries](../architecture/MODULE_BOUNDARIES.md).

## 2. Dependencies point inward

```text
apps (web · admin · mobile · api · workers)
  ↓
adapters (database · api-client · design-system)
  ↓
domain (domain · battle-engine · economy)
  ↓
shared kernel (shared-types)
```

The domain layer knows nothing about HTTP, SQL, React, NestJS or Redis. Those depend on it.

Repository interfaces are declared **by the domain** and implemented **by the database
package** — dependency inversion, which is what lets domain logic be tested against
in-memory fakes with no database at all.

Enforced by `no-restricted-imports` rules in `eslint.config.mjs`, verified to fire.
See [dependency rules](../architecture/DEPENDENCY_RULES.md).

## 3. One database, one source of truth

PostgreSQL holds all durable state. Redis is a cache and a queue and is **never** the
source of truth for anything a player owns — a Redis restart must be an availability
event, never a data-loss event.

No database-per-module. That is a service-boundary pattern, and adopting it inside a
monolith gives up transactions while gaining nothing.

## 4. Server-authoritative, always

Architectural restatement of [engineering principle 1](ENGINEERING_PRINCIPLES.md#1-the-server-is-the-only-authority):
the client is a rendering layer. Any design where a client computes a value the server then
trusts is rejected at review, regardless of how much simpler it looks.

## 5. Immutable facts, derived state

Anything with financial or ownership meaning is recorded as an immutable event, and the
current state is derived from it:

- balances derive from ledger entries;
- ownership history derives from transfer records;
- battle results are recorded with their seed and content version.

A cached balance column is a legitimate optimisation — but it must be _derivable from_ and
_reconcilable against_ the immutable record, never the other way round. See
[economy integrity rules](ECONOMY_INTEGRITY_RULES.md).

## 6. Side effects go through the outbox

A domain operation writes its business change and an outbox row **in the same
transaction**. A relay process delivers the event afterwards.

This is the only way to avoid the two failure modes that otherwise appear the first time a
process dies at the wrong moment:

- publish-then-commit → the seller is told they sold an item they still own;
- commit-then-publish → the sale is real and nobody is ever notified.

Delivery is **at-least-once**, so every consumer must be idempotent. See
[event architecture](../architecture/EVENT_ARCHITECTURE.md).

## 7. Cloud-neutral until there is a reason not to be

Storage goes through an S3-compatible interface (MinIO locally, any S3 API later). No
provider-specific service is adopted without an ADR.

Not because multi-cloud is a goal — it is not — but because provider lock-in should be a
decision with a stated benefit, not something that accumulates by default while nobody is
looking. See [ADR-0019](../adr/ADR-0019-cloud-neutral-architecture.md).

## 8. Local development is real, not simulated

Local infrastructure runs the same PostgreSQL, Redis and S3 API as a hosted environment,
via Docker Compose. Not SQLite, not an in-memory queue, not a fake S3.

A stack that only works against substitutes is a stack whose real behaviour is untested,
and the differences surface in production. See
[local development](../runbooks/LOCAL_DEVELOPMENT.md).

## 9. Every diagram maps to something real

A diagram must correspond to code that exists in this repository, or be explicitly labelled
as a proposal with a date.

A decorative diagram of a system nobody built is worse than no diagram, because it will be
believed and then designed against.

## 10. Cost is an architectural constraint

The system must run for **zero external cost** during development and near-zero during
closed testing. Managed services, replicas, CDNs and autoscaling are added when a
measurement justifies them, not in anticipation.

See [cost strategy](../architecture/COST_STRATEGY.md).

## 11. Design for the extraction you may never do

Each domain module should be extractable into a service _if it ever needs to be_:
own its data, expose an explicit interface, communicate with other modules through that
interface or through events — never by reaching into their tables.

Design for it. Do not do it. Most modules never will, and that is the correct outcome.

---

## When to escalate

Stop and get an architecture review before:

- adding an infrastructure dependency (a broker, a search engine, a second database);
- changing a trust boundary;
- changing the shape of currency, ownership or inventory;
- introducing a cross-module database join;
- proposing an irreversible migration;
- extracting a module into a service.

Full list and process: [AI agent rules](AI_AGENT_RULES.md#escalation).

Related: [Architecture overview](../architecture/ARCHITECTURE_OVERVIEW.md) ·
[Module boundaries](../architecture/MODULE_BOUNDARIES.md) · [ADR index](../adr/README.md)
