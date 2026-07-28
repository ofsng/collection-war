# Infrastructure

> Date: 2026-07-28. **Nothing is deployed. No hosted infrastructure exists. Zero cost has
> been incurred.**

---

## Layout

```text
infrastructure/
├── docker/       container assets — empty; images are not built yet
├── database/
│   ├── init/     scripts PostgreSQL runs on first start (mounted read-only)
│   └── backups/  local dumps — git-ignored
├── deployment/   deployment assets — empty, deliberately
└── monitoring/   monitoring configuration — empty, deliberately
```

The local stack is defined in [`docker-compose.yml`](../docker-compose.yml) at the repository
root, where it is easy to find.

---

## Local

```bash
pnpm infra:up       # PostgreSQL 17, Redis 7, MinIO, Mailpit — waits for health checks
pnpm infra:status
pnpm infra:logs
pnpm infra:down     # stop, keep data
pnpm infra:reset -- --yes    # DESTRUCTIVE
```

**Real engines, not substitutes.** Not SQLite, not an in-memory queue, not a fake S3 — the
differences are exactly where the bugs are, and a stack that only works against substitutes
has untested real behaviour.

Every port binds to `127.0.0.1`. Credentials are well-known development values, useless
anywhere else.

> [!WARNING]
> **Docker was not available on the machine this repository was bootstrapped on.** The
> compose file has been written and reviewed but **never started**. Its health checks, the
> MinIO bucket initialisation and the PostgreSQL locale setting are all **unverified**.
>
> See [BOOTSTRAP_ENVIRONMENT.md](../docs/status/BOOTSTRAP_ENVIRONMENT.md) and
> [RISKS.md](../docs/status/RISKS.md).

---

## Why `deployment/` and `monitoring/` are empty

Not an oversight.

**Deployment:** an automatic production deploy is a loaded weapon. Before one exists there
must be somewhere to deploy, a **tested** rollback, safe migrations, real secret management,
monitoring that would notice a bad deploy, and someone who can be woken up. None of that
exists, and a deploy workflow written now would be untested automation pointed at production.

**Monitoring:** a metrics stack before there is traffic to observe costs money and operational
complexity in exchange for no signal. Structured logging and correlation ids exist from day
zero precisely because _those_ are painful to retrofit; a collector is not.

See [DEPLOYMENT_ARCHITECTURE.md](../docs/architecture/DEPLOYMENT_ARCHITECTURE.md) and
[OBSERVABILITY_ARCHITECTURE.md](../docs/architecture/OBSERVABILITY_ARCHITECTURE.md).

---

## Before adding anything here

- **No cloud account, hosted database, domain or billing** without explicit owner approval.
- New infrastructure needs an [ADR](../docs/adr/README.md): what problem it solves, what it
  costs to run, who operates it, what fails when it is down.
- No Kubernetes, message broker, search cluster or CDN before a measurement asks for one —
  see [non-goals](../docs/product/NON_GOALS.md).

Cost is an architectural constraint, not an afterthought:
[COST_STRATEGY.md](../docs/architecture/COST_STRATEGY.md).
