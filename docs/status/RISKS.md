# Risks

> **Date: 2026-07-28.** Perishable — re-read the dates.
> Audience: whoever is deciding what to do next.

Ordered by expected damage, not by likelihood.

---

## R1 — Local infrastructure has never been started · **MEDIUM** (was HIGH)

> **Substantially reduced on 2026-07-28.** Integration tests now run against real PostgreSQL
> in-process via PGlite ([ADR-0025](../adr/ADR-0025-pglite-for-integration-tests.md)). 54 of
> them pass, covering the schema, every correctness constraint, transactions and the complete
> playable loop. What Docker was needed for is now mostly covered — **except concurrency**,
> which is now tracked separately as [R13](#r13--concurrency-is-untested--high).

Docker was not installed on the bootstrap machine, so `docker-compose.yml` has been written
and reviewed but **never run**. Unverified as a result:

- every service health check;
- the MinIO bucket initialisation;
- the PostgreSQL `--locale=C` setting;
- the entire migration cycle;
- all six integration tests;
- `SERIALIZABLE` isolation behaviour;
- transaction rollback.

**Impact.** Every claim about local development is currently a claim about a configuration
file, not about a working system. The transaction and isolation guarantees the economy design
rests on are **unproven in practice**.

**Mitigation.** `pnpm infra:up` fails with an explicit install-Docker message rather than a
confusing error. Everything is documented so the first person with Docker can verify it in
minutes.

**Action.** [B1 in the backlog](../tasks/BACKLOG.md). Run it, and update every document that
says "unverified".

---

## R2 — The product vision was inferred, not provided · **HIGH**

[Product vision](../product/PRODUCT_VISION.md), [principles](../product/PRODUCT_PRINCIPLES.md)
and [MVP scope](../product/MVP_SCOPE.md) were **derived from the domain structure**. No
product brief, design document or research was supplied.

**Impact.** The architecture was built to serve a product model nobody has confirmed. If the
inference is wrong in a structural way — the economy is not central, or the marketplace is not
player-to-player — then significant decisions were optimised for the wrong thing.

**Mitigation.** Every product document is marked unapproved and dated. The _architectural_
decisions (server authority, ledger-first, determinism) are defensible for almost any game of
this shape.

**Action.** [B2 in the backlog](../tasks/BACKLOG.md). An hour of the owner's time, worth more
than anything below it.

---

## R3 — No authentication exists · **HIGH (for readiness), LOW (today)**

There is no login anywhere. Consequently there is no authorization enforcement, no session
handling, no rate limiting on credentials, and the admin console denies everything.

**Impact today: none** — there is nothing to protect and nobody to authenticate.
**Impact on readiness: total** — nothing can ship without it, and it gates most of the
backlog.

**Mitigation.** The admin guard **fails closed**, with a test asserting it. A placeholder
session is the most dangerous shortcut available here, and the test exists to make adding one
fail the build.

**Action.** CW-0003, after CW-0002.

---

## R4 — The mobile app has never run · **MEDIUM**

It typechecks, lints and passes 13 logic tests. It has never rendered a frame on a device or
an emulator.

**Impact.** Runtime problems that static analysis cannot catch — Metro resolution in a pnpm
workspace, native module behaviour, layout on a real screen — are entirely undiscovered. The
first person to run it may find a wall of them.

**Mitigation.** `metro.config.js` is configured for the workspace layout. Native modules are
stubbed for tests, and the limitation is stated in every document that mentions mobile.

**Action.** Run it. Listed in the [backlog](../tasks/BACKLOG.md).

---

## R5 — CI has never executed · **MEDIUM**

Three workflows are written. There is no Git remote, so none has ever run.

**Impact.** Syntax errors, missing steps, wrong action versions and service-container
misconfiguration are all undiscovered. CI that has never run is a hypothesis.

**Action.** Push to a remote — **with explicit owner approval** — and watch the first run.

---

## R6 — Economy correctness is proven only in unit tests · **LOW for now**

**No currency exists yet**, so the ledger is not exercised by anything and cannot currently be
got wrong in production terms.

The _mechanisms_ it will rely on are now verified against real PostgreSQL: the unique index
rejects a duplicate idempotency key, `CHECK (quantity >= 0)` rejects a negative stack, and a
failed transaction rolls back completely.

**What remains untested is concurrency** — see [R13](#r13--concurrency-is-untested--high).
That must be closed before any economy or marketplace work, not before the next slice.

---

## R13 — Concurrency is untested · **HIGH**

PGlite is **single-connection**. It cannot run two transactions at once, so none of these has
ever been exercised:

- two simultaneous starter grants for one player;
- two concurrent reward claims with the same idempotency key;
- a genuine `40001` serialization failure and the retry in `createUnitOfWork`;
- connection-pool behaviour under load.

**Impact.** The single-request paths are well covered. The _concurrent_ paths — which is where
double-spend bugs actually live — are not. A bug here would surface as an intermittent
production failure, the hardest kind to diagnose.

**Mitigation.** The protections are structural (database unique indexes and CHECK constraints
rather than application checks), so they are the kind most likely to hold under concurrency.
That is an argument for confidence, **not** a substitute for the test.

**Action.** Run the suite against real PostgreSQL with a concurrency test file. **Required
before the economy or marketplace phase.**

---

## R7 — The `SERIALIZABLE` retry path is untested under real contention · **MEDIUM**

`createUnitOfWork` retries SQLSTATE `40001` with jittered backoff. That code path has never
executed, because no serialization failure has ever occurred.

**Impact.** A bug in the retry logic would surface as intermittent failures under concurrent
load — the hardest kind to diagnose, and it would appear first in production.

**Action.** A concurrency integration test, after R1.

---

## R8 — No penetration test, and no per-domain threat model · **MEDIUM (for launch)**

Only the platform-level [threat model](../security/THREAT_MODEL.md) exists.

**Mitigation.** Most current mitigations are _architectural_ — server authority, dependency
boundaries, determinism enforcement, log redaction — and those are the hardest to undo.

**Action.** Per-domain threat models are part of CW-0002. A penetration test before
production.

---

## R9 — No Content Security Policy on the web application · **LOW today**

Deliberately deferred: a CSP written before the application has real assets is either so
permissive it does nothing, or so strict it breaks the first feature that adds an image.

Other headers are set (`nosniff`, `X-Frame-Options: DENY`, referrer policy, permissions
policy). Admin additionally sets `frame-ancestors 'none'`.

**Action.** Before production.

---

## R10 — Node 18 is the machine default · **LOW, but recurring**

`.nvmrc` pins 22.16.0 and `engine-strict=true` makes an install on Node 18 fail loudly. But
`nvm use` must be run in **every shell**, and forgetting it is a recurring source of confusing
failures.

**Mitigation.** The failure is loud and names the problem. Documented in the runbook and in
both AI adapters.

---

## R11 — jsdom is pinned behind the current release · **LOW**

jsdom 30 requires Node `^22.22`; the machine has 22.16. jsdom 29.1.1 was pinned rather than
mutating the developer's global toolchain.

**Action.** Unpin when Node is upgraded.

---

## R12 — Turborepo cache correctness · **LOW**

Cache hits depend on correctly declared `inputs` and `outputs`. A missing output means a cache
hit returns an incomplete build — the worst kind of failure, because it looks like success.

**Mitigation.** Outputs are declared explicitly per task. `--force` bypasses the cache and is
documented.

---

## Accepted risks

Knowingly accepted, with the reason. **An unlisted accepted risk is an unnoticed
vulnerability.**

| Risk                                      | Why accepted                                                                         | Revisit                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| Placeholder credentials in `.env.example` | Every service they reach is a local, non-networked container bound to `127.0.0.1`    | Never — they must never be reused           |
| No monitoring or alerting                 | Nothing deployed to monitor                                                          | With the first hosted environment           |
| No SBOM                                   | Not useful without a deployment                                                      | Before production                           |
| No automated dependency bot               | It would either be merged unreviewed — defeating exact pinning — or ignored as noise | If the dependency count grows substantially |
| Analytics PII guard is structural only    | It cannot prove absence, but it catches the obvious additions in review              | When gameplay events are designed           |
| No mobile component tests                 | Rendering RN under Vitest tests a simulation, not React Native                       | With on-device testing                      |

---

Related: [Current state](CURRENT_STATE.md) · [Deferred work](DEFERRED_WORK.md) ·
[Technical debt](TECHNICAL_DEBT.md) · [Backlog](../tasks/BACKLOG.md)
