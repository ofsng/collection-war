# ADR-0013: Docker Compose for local infrastructure

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Local development needs PostgreSQL, Redis, S3-compatible storage and an SMTP capture tool.
Every developer must get the same versions, the same configuration and the same behaviour.

There is a real temptation to substitute lighter alternatives — SQLite for PostgreSQL, an
in-memory queue for Redis, a fake S3. Each substitution makes setup easier and makes local
testing less meaningful.

## Decision

**Docker Compose**, with the real engines:

| Service        | Image                | Local port  |
| -------------- | -------------------- | ----------- |
| PostgreSQL     | `postgres:17-alpine` | 5432        |
| Redis          | `redis:7-alpine`     | 6379        |
| MinIO (+ init) | `minio/minio`        | 9000 / 9001 |
| Mailpit        | `axllent/mailpit`    | 1025 / 8025 |

Every port binds to `127.0.0.1`. Named volumes, health checks, and `pnpm infra:up` using
`--wait` so a green exit means the services are genuinely ready — not merely created.

## Alternatives considered

**Locally installed services.** No Docker requirement. Rejected: version drift between
machines, platform-specific installation, and no clean reset.

**SQLite and in-memory substitutes.** Fastest setup, zero dependencies. **Rejected firmly.**
The differences are exactly where the bugs are: `SERIALIZABLE` isolation, partial indexes,
`jsonb`, concurrent write behaviour, and BullMQ's blocking semantics. A stack that only works
against substitutes has untested real behaviour, and it surfaces in production.

**Testcontainers.** Excellent for integration tests, and worth adopting for CI. Rejected as
the primary local setup: containers per test run are slower for day-to-day development than
one long-lived stack.

**A shared hosted development environment.** Rejected: it costs money from day one, requires
connectivity, and one developer's migration breaks everyone else.

## Positive consequences

- **The same engines locally as in production.** Local testing means something.
- One command to a working stack; one command to reset it.
- Health checks make readiness deterministic rather than a guess with a `sleep`.
- PostgreSQL is initialised with `--locale=C`, so ordering is deterministic and does not
  depend on the host locale — which matters here, since Turkish casing differs from C.
- Mailpit captures all mail locally, so a notification bug cannot email a real person.
- `127.0.0.1` binding means nothing is reachable from the network.
- Zero cost.

## Negative consequences

- **Docker is a prerequisite**, and it is a substantial install.
- Container resource usage on a development machine.
- Docker Desktop licensing is a consideration for commercial use on macOS and Windows.
- Slower filesystem performance on non-Linux hosts (not relevant here — bind mounts are only
  used for the read-only init directory).

## Risks

- **Docker was NOT available on the bootstrap machine.** The compose file has been written
  and reviewed but **never started**. Its health checks, the MinIO bucket initialisation and
  the PostgreSQL locale setting are all **unverified**. This is the single largest gap in the
  bootstrap and is recorded in [risks](../status/RISKS.md) and
  [bootstrap environment](../status/BOOTSTRAP_ENVIRONMENT.md).
- Version drift between the compose file and a hosted environment. Mitigated by pinning major
  versions and reviewing them together.

## Review conditions

- **Immediately:** someone with Docker must run `pnpm infra:up` and confirm every service
  reports healthy. Until then, the local infrastructure is designed, not proven.
- Compose becomes insufficient for a genuine multi-service need → reconsider, but note that
  Kubernetes is an explicit [non-goal](../product/NON_GOALS.md).
- Adopt Testcontainers for CI integration tests when CI runs them.
