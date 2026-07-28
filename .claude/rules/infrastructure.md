# Rule: Infrastructure

**Canonical:** [DEPLOYMENT_ARCHITECTURE.md](../../docs/architecture/DEPLOYMENT_ARCHITECTURE.md) ·
[COST_STRATEGY.md](../../docs/architecture/COST_STRATEGY.md) ·
[LOCAL_DEVELOPMENT.md](../../docs/runbooks/LOCAL_DEVELOPMENT.md)

---

## Absolutely never

- **Create a cloud account, a hosted database, a domain, or anything with billing.**
- Deploy anything.
- Create an EAS project.
- Enable a paid service or a free tier that converts to paid.

Cost is an architectural constraint. Everything runs locally at zero cost, and creating a
paid resource requires explicit owner approval — not an agent's judgement.

## Local infrastructure

```bash
pnpm infra:up       # PostgreSQL, Redis, MinIO, Mailpit — waits for health checks
pnpm infra:status
pnpm infra:logs
pnpm infra:down     # stop, keep data
pnpm infra:reset -- --yes    # DESTRUCTIVE, requires explicit confirmation
```

**Real engines, not substitutes.** Not SQLite, not an in-memory queue, not a fake S3 — the
differences are exactly where the bugs are, and a stack that only works against substitutes
has untested real behaviour.

Every port binds to `127.0.0.1`. Credentials are well-known development values, useless
anywhere else.

## Docker was not available on the bootstrap machine

`docker-compose.yml` has been **written and reviewed but never started**. Its health checks,
the MinIO bucket initialisation and the PostgreSQL locale setting are all **unverified**.

**Do not describe local infrastructure as working.** It is configured. See
[RISKS.md](../../docs/status/RISKS.md).

## No deployment pipeline, deliberately

An automatic production deploy is a loaded weapon. Before one exists there must be: somewhere
to deploy, a tested rollback, safe migrations, real secret management, monitoring that would
notice, and someone who can be woken up.

None of that exists. **A deploy workflow written now would be untested automation pointed at
production.**

The CI workflows verify code. They do not ship it.

## Adding infrastructure

Requires an ADR. State: what problem it solves, what it costs to run, who operates it, what
fails when it is down, and why the existing components are insufficient.

**No** Kubernetes, message broker, search cluster, monitoring stack or CDN before a
measurement asks for one. See [non-goals](../../docs/product/NON_GOALS.md).

## Scripts are cross-platform Node

Not shell. `scripts/*.mjs` branch on **exit codes**, never on parsing localized shell output
— the bootstrap machine emits Turkish error messages, and string matching would break
silently.
