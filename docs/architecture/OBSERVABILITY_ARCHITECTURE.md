# Observability Architecture

> Audience: anyone adding logging, or trying to debug something that already happened.
> Date: 2026-07-28.

---

## The question observability has to answer

Not "is the server up" — a health check answers that. The real question is:

> A player says their gold disappeared three days ago. What happened?

Answering it requires: finding their request among millions, following it through the API,
the transaction, the outbox and the worker, and seeing the state at each step — without any
of that having leaked their credentials into a log aggregator.

Everything below is in service of that.

---

## Structured logging

JSON, via Pino, through `@collection-war/observability`. `console` is lint-blocked in
application code because unstructured output cannot be queried, filtered or redacted.

```json
{
  "level": "info",
  "time": "2026-07-28T10:00:00.000Z",
  "service": "collection-war-api",
  "environment": "production",
  "correlationId": "018f4c1a-...",
  "playerId": "018f...",
  "msg": "marketplace listing sold"
}
```

**Message strings are constant; variable data goes in the context.**

```ts
log.info({ playerId, listingId }, 'marketplace listing sold'); // groupable, alertable
log.info({}, `player ${playerId} sold listing ${listingId}`); // ungroupable, useless
```

The second form produces a million distinct messages that cannot be counted, grouped or
alerted on.

ISO timestamps rather than epoch milliseconds: logs are read by humans during incidents at
least as often as they are parsed by machines. Levels are emitted as labels (`"info"`) rather
than pino's numeric codes, which saves everyone from memorising them.

---

## Redaction

**Deny-by-default, by key pattern, at the logger itself.**

Every incident review of a leaked credential ends the same way: nobody meant to log it. A
request body was logged wholesale, or an error object carried a config value, or a debug line
survived a merge.

Two mechanisms:

1. **Pino paths** (`REDACTED_PATHS`) for structured request and response logging.
2. **`redactDeep`** for payloads assembled by hand, matching `password`, `token`, `secret`,
   `authorization`, `api[-_]?key`, `cookie`, `session[-_]?id`, `card[-_]?number`, `cvv`,
   `iban`, `ssn` and their spelling variants at any depth.

Deliberately broad. A false positive costs one unreadable log line; a false negative costs a
credential rotation.

`redactDeep` is depth-bounded at 8, so a cyclic or pathological structure cannot hang a
logging call and take the request down with it.

Connection strings are masked to keep the host readable and the password hidden:
`postgresql://user:[REDACTED]@localhost:5432/db`.

---

## Correlation ids

One id, threaded through everything a single player action touches.

```mermaid
flowchart LR
    c["Client<br/><i>mints or omits</i>"] -->|X-Correlation-Id| api["API<br/><i>adopts or mints</i>"]
    api --> logs["API logs"]
    api --> outbox["Outbox row"]
    outbox --> worker["Worker"]
    worker --> wlogs["Worker logs"]
    api -->|echoed back| c

    classDef n fill:#2b323c,stroke:#6e7781,color:#e8ecf1
    class c,api,logs,outbox,worker,wlogs n
```

**The id is echoed back to the client.** That matters: when a player reports a problem, the
id they can read off a support screen is the same id in the server logs. Without it, support
debugging starts with guessing which of thousands of requests was theirs.

**An incoming id is validated, never trusted.** It is written into log lines, so an
unvalidated header is a log-injection and log-flooding vector. `resolveCorrelationId`
accepts `[A-Za-z0-9_-]{8,128}` and silently replaces anything else — a malformed trace header
should not fail a player's request.

---

## What to log, and at what level

| Level   | Use for                                                                   |
| ------- | ------------------------------------------------------------------------- |
| `fatal` | The process cannot continue                                               |
| `error` | An unhandled failure, a 5xx, a dead-lettered event                        |
| `warn`  | A rejected request (4xx), a retry, a degraded dependency                  |
| `info`  | Business events: registration, purchase, sale, reward claim, admin action |
| `debug` | Development detail                                                        |
| `trace` | Very verbose; off outside local                                           |

A 4xx is logged as `warn` and a 5xx as `error` on purpose: a client sending a malformed
request is not an incident; a 500 is.

**Always log:** every economy operation, every ownership change, every admin action, every
auth success and failure, every dead letter.

**Never log:** passwords, tokens, full request bodies of auth endpoints, raw personal data,
or anything the redaction list would have caught if you had remembered.

---

## Health and readiness

Two different questions, and conflating them causes restart loops.

**`/health` — liveness.** "Is this process alive?" Touches **nothing** external. If it
checked the database, a database outage would fail every instance's liveness probe and get
them all killed — turning a recoverable dependency failure into a total, self-inflicted
outage.

**`/ready` — readiness.** "Can this process serve traffic?" Checks dependencies and returns
**503** when one is down, so the load balancer stops routing while leaving the process
running to recover.

503 rather than 200-with-a-flag, because load balancers and orchestrators read the **status
code**. A body saying `"degraded"` behind a 200 is ignored by every one of them.

Every dependency check is **bounded** (2s) and they run **in parallel** — an unbounded check
turns a slow dependency into a hung probe, and sequential checks make the probe's latency the
sum of its dependencies'.

---

## Metrics and tracing

**Not implemented, deliberately.**

Adding an OpenTelemetry collector and a metrics stack before there is traffic to observe
costs money and operational complexity in exchange for no signal.

The staged plan:

| Stage       | What is added                                                                           | Trigger                                                         |
| ----------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **0 — now** | Structured logs, correlation ids, health/readiness                                      | —                                                               |
| **1**       | Log aggregation with search and retention                                               | A hosted environment exists                                     |
| **2**       | RED metrics (rate, errors, duration) + alerts on error rate and p99                     | Real users                                                      |
| **3**       | Distributed tracing                                                                     | More than one service, or a latency problem logs cannot explain |
| **4**       | Business dashboards: economy reconciliation, faucet/sink balance, marketplace liquidity | The economy is live                                             |

Correlation ids exist from day zero precisely because retrofitting them is painful and
adding a tracing backend later is not.

---

## Alerting

None configured — there is nothing deployed to alert about. When there is, the first alerts
should be the ones that indicate real harm:

1. **Economy reconciliation non-zero** — page immediately. Value has been created or lost.
2. Outbox dead letters accumulating — a business fact is not being delivered.
3. Error rate or p99 beyond threshold.
4. Readiness failing across instances.
5. Failed authentication spike — credential stuffing.

**Alert on symptoms players feel, not on causes.** "CPU is at 80%" is not an alert; "purchases
are failing" is.

---

## Bootstrap status

- Structured logging, redaction, correlation: **implemented and tested** (11 tests).
- Health and readiness: **implemented and verified over HTTP**, including the 503 path with
  dependencies down.
- Log aggregation, metrics, tracing, alerting: **not implemented.**

Related: [Container architecture](CONTAINER_ARCHITECTURE.md) ·
[Incident response](../runbooks/INCIDENT_RESPONSE.md) · [Cost strategy](COST_STRATEGY.md)
