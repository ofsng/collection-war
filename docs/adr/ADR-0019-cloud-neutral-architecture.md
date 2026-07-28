# ADR-0019: Cloud-neutral initial architecture

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

No cloud provider has been chosen, no account exists, and no cost has been incurred. Provider
pricing, free tiers and regional availability all change, and the project's eventual scale is
unknown.

Meanwhile, provider-specific dependencies accumulate by default. Nobody decides to become
locked in; it happens one convenient SDK at a time.

## Decision

**Depend only on portable interfaces until a provider is deliberately chosen.**

| Concern        | Portable choice          | Avoided                                             |
| -------------- | ------------------------ | --------------------------------------------------- |
| Database       | PostgreSQL wire protocol | Aurora-specific features, Spanner, DynamoDB         |
| Cache / queue  | Redis protocol           | ElastiCache-specific APIs, SQS, Cloud Tasks         |
| Object storage | S3 API                   | Provider SDK extensions                             |
| Compute        | A container image        | Lambda, Cloud Functions, provider-specific runtimes |
| Config         | Environment variables    | Provider parameter stores (at this stage)           |
| Mail           | SMTP                     | Provider-specific mail APIs                         |

**Multi-cloud is not the goal** — running on two providers simultaneously is a cost with no
benefit here. The goal is that **lock-in becomes a decision with a stated reason**, rather
than something that has already happened.

## Alternatives considered

**Commit to one provider now and use its full platform.** Better integration, managed
everything, less code. Rejected: it is a commitment made before the information needed to
make it exists — expected scale, expected cost, regional needs. It also makes local
development harder, since provider services generally cannot run on a laptop.

**A platform-as-a-service (Heroku, Render, Railway, Fly).** Genuinely attractive for a
project this size, and still compatible with this decision — they run containers and offer
managed PostgreSQL and Redis over standard protocols. **Not rejected**; simply not chosen
yet.

**Kubernetes for portability.** Rejected: portability at the cost of operating Kubernetes for
two processes. Named as a [non-goal](../product/NON_GOALS.md).

**Serverless.** Rejected: cold starts and connection-pool exhaustion against PostgreSQL, plus
deep provider coupling.

## Positive consequences

- **Providers can be compared** on price, egress and region when the decision is actually
  made.
- **Local development is real** — the same PostgreSQL, Redis and S3 API run on a laptop.
- No account, no credit card, no cost during development.
- Migration between providers is a configuration change for the common cases.
- No provider outage takes down something the project cannot host itself.

## Negative consequences

- **Managed conveniences are forgone**: provider-native queues, managed identity, integrated
  monitoring, auto-scaling policies.
- Some infrastructure work must be done rather than bought.
- The lowest-common-denominator API is sometimes less capable.
- Portability that is never exercised is portability that may not actually work.

## Risks

- **Untested portability.** The architecture is portable by construction, but no migration has
  been performed. The first real deployment will reveal whatever was missed.
- Provider-specific creep after the first deployment. Mitigated by requiring an ADR for any
  provider-specific dependency.

## Review conditions

- A provider is chosen → a new ADR records the choice and what lock-in is accepted with it.
- A provider-specific service would deliver a large, measurable benefit → new ADR, stating
  the benefit and the exit cost.
- **This decision does not forbid choosing a provider.** It forbids choosing one by accident.
