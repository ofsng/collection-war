# Cost Strategy

> Audience: whoever is about to create an account with a credit card attached.
> Date: 2026-07-28.

---

## Position

**Cost is an architectural constraint, not an afterthought.**

Collection War must run at **zero external cost** through development and near-zero through
closed testing. Every managed service, replica, CDN and monitoring tool is added when a
measurement justifies it — never in anticipation.

**No cost figures appear in this document.** Provider pricing changes constantly and varies
by region, commitment and free tier. A number written today would be wrong within months and
would be believed anyway. What is documented instead is **what drives cost** and **which
levers reduce it** — those are stable.

---

## Stage 0 — Local development · **current**

|                 |                                                                                      |
| --------------- | ------------------------------------------------------------------------------------ |
| Infrastructure  | PostgreSQL, Redis, MinIO, Mailpit — all in Docker Compose on the developer's machine |
| Hosted services | **None**                                                                             |
| Cost            | **Zero**                                                                             |
| Verified        | Configured. Not started — Docker was unavailable during the bootstrap.               |

**Why local rather than a cheap shared development server:** a shared environment costs money
from the first day and buys nothing while one person is working. It also becomes a de facto
staging environment that nobody maintains.

**What this stage must prove** before moving on: the stack runs, migrations apply, tests pass
against real infrastructure, and the economy invariants hold under concurrency.

---

## Stage 1 — Private hosted environment

**Trigger:** more than one person needs to reach the same running system, or a mobile build
must talk to something that is not `localhost`.

| Component | Choice                                                 | Cost driver                     |
| --------- | ------------------------------------------------------ | ------------------------------- |
| Compute   | One small container instance, API + worker             | Instance size, hours            |
| Database  | Smallest managed PostgreSQL                            | Storage, IOPS, backup retention |
| Cache     | Smallest managed Redis, or Redis in the same container | Memory                          |
| Storage   | S3-compatible bucket                                   | Storage + **egress**            |
| Mail      | Transactional provider free tier                       | Messages/month                  |
| Domain    | One                                                    | Annual                          |

**Levers at this stage:**

- Use free tiers deliberately, and know their expiry dates.
- One environment, not three. Staging can wait until there is something to stage.
- Scale to zero if the platform supports it — nobody uses a development environment at 3am.
- Prefer a provider with **no egress charges** for object storage. Egress is the line item
  that surprises people.

---

## Stage 2 — Closed testing

**Trigger:** real testers with real accounts and real (soft-currency) economy activity.

Newly justified:

- **Automated backups with point-in-time recovery** — non-negotiable once data is not
  disposable.
- **Log aggregation** — grepping container logs stops working with more than one instance.
- **Basic alerting** — error rate, readiness, and economy reconciulation.
- **Push notification credentials** — an account, not usually a bill.

Still not justified: a CDN, read replicas, autoscaling, distributed tracing, an APM vendor.

**Levers:** short log retention (logs are the sneakiest cost, and the biggest personal-data
risk); one instance size up rather than two instances; keep staging off except when in use.

---

## Stage 3 — Public launch

Justified by real traffic and real revenue:

| Addition              | Justified when                                                                       |
| --------------------- | ------------------------------------------------------------------------------------ |
| Multiple API replicas | One instance cannot absorb peak, or availability requires redundancy                 |
| Load balancer         | More than one replica exists                                                         |
| CDN                   | Asset egress is measurable, or players are geographically spread                     |
| Read replicas         | Read load is measurably the constraint — see [scaling strategy](SCALING_STRATEGY.md) |
| Autoscaling           | Load is genuinely variable AND fixed capacity is wasteful                            |
| Distributed tracing   | A latency problem exists that logs cannot explain                                    |
| Paid error reporting  | Error volume exceeds what logs make tractable                                        |

---

## What drives cost, in rough order

1. **Database.** Instance size, storage, IOPS, backup retention, replicas. Usually the
   largest line item and the hardest to reduce later.
2. **Egress.** Data leaving the provider. Assets, API responses, backups pulled out.
   Consistently the most underestimated item.
3. **Compute hours.** Instances running when nothing is using them.
4. **Log volume and retention.** Verbose logging kept for 90 days costs more than the
   application producing it.
5. **Managed service premiums.** Convenience has a price; it is usually worth paying for the
   database and rarely worth paying for everything else.
6. **Per-seat SaaS.** Error tracking, analytics, feature flags. Each is small; together they
   are not.

---

## Structural levers already built in

Decisions already made that keep cost optional rather than baked in:

- **Cloud-neutral storage** (S3-compatible) — providers can be compared and switched.
- **A modular monolith** — one process to run, not fifteen.
- **No message broker** — PostgreSQL and Redis do the job at this scale.
- **Cursor pagination** — avoids the deep-offset scans that drive database CPU.
- **UUIDv7 keys** — index well, so the database stays smaller and faster for longer.
- **Structured logging with levels** — verbosity is a configuration change, not a code change.
- **Deterministic battle resolution** — pure and parallelisable, so it scales on cheap compute
  rather than on database capacity.

---

## Rules

1. **No account with billing enabled is created without explicit owner approval.**
2. **Every recurring cost has a named owner and a stated reason.**
3. **Budget alerts before the first paid resource, not after the first surprising invoice.**
4. **Delete unused resources.** An orphaned database from an experiment bills forever.
5. **Free tiers have expiry dates.** Write them down.
6. **Review monthly.** Cost drift is quiet.

---

## Bootstrap status

**Zero cost incurred.** No account created, no resource provisioned, no domain registered, no
billing configured. Every command in this repository runs locally.

Related: [Deployment architecture](DEPLOYMENT_ARCHITECTURE.md) ·
[Scaling strategy](SCALING_STRATEGY.md) · [Non-goals](../product/NON_GOALS.md)
