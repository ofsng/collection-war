# Background Job Catalog

> Audience: anyone adding a job. Date: 2026-07-28.
> **No job processor is implemented yet.** This is the register and the contract.

---

## Event versus job

|              | Domain event                   | Background job              |
| ------------ | ------------------------------ | --------------------------- |
| Is           | A **fact**: something happened | **Work** to be done         |
| Named        | Past tense — `Battle.Resolved` | Imperative — `relay-outbox` |
| Delivered by | The outbox relay               | BullMQ                      |
| Fails how    | Retried, then dead-lettered    | Retried, then dead-lettered |

An event may _cause_ a job. A job may _publish_ an event. They are not the same thing, and
conflating them produces a system where nobody can tell what is a record and what is a task.

---

## The register

### `outbox-relay` — highest priority

**The first processor to build.** Every other domain's events depend on it.

|             |                                                                         |
| ----------- | ----------------------------------------------------------------------- |
| Trigger     | Polls `outbox` where `status = 'PENDING' AND next_attempt_at <= now()`  |
| Concurrency | **1 initially.** Multiple relays need `SELECT … FOR UPDATE SKIP LOCKED` |
| Idempotency | Consumers must be idempotent — delivery is at-least-once                |
| Failure     | Exponential backoff with **full jitter**; dead-letter after 8 attempts  |
| Alert       | Lag > 10s sustained; any dead letter                                    |

Without jitter, every message that failed during an outage retries at the same instant on
recovery and immediately undoes it.

### `scheduled` — time-based game state

| Job                   | Trigger                   | Idempotency                      | Notes                                                  |
| --------------------- | ------------------------- | -------------------------------- | ------------------------------------------------------ |
| `complete-expedition` | `completes_at <= now()`   | Expedition status transition     | **Server time only.** A device clock is attacker input |
| `expire-listing`      | `expires_at <= now()`     | Listing status transition        | Must return the escrowed asset                         |
| `reset-daily-quests`  | Cron, per player timezone | `reset_key` on the row           | The key is what makes a re-run safe                    |
| `accrue-habitat`      | On read, not on a timer   | Derived from `last_collected_at` | Computed, not swept                                    |

`accrue-habitat` is deliberately **not** a job: accrual is a pure function of elapsed time, so
computing it on read is cheaper and cannot drift.

### `notifications`

| Job                                                 | Trigger                             |
| --------------------------------------------------- | ----------------------------------- |
| `deliver-push` / `deliver-email` / `deliver-in-app` | `Notifications.NotificationCreated` |

**A push payload appears on a lock screen.** It must never contain a balance, a token, a
verification code, or another player's data.

### `analytics` — lowest priority

`forward-events`, `aggregate-daily`. **Must never block or slow a player-facing request.** If
the analytics pipeline is down, players should not notice.

### `maintenance`

| Job                      | Purpose                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `sweep-idempotency-keys` | Delete past `expires_at`. Long enough to cover a late retry; not forever |
| `sweep-outbox`           | Delete published rows after a retention window                           |
| `reconcile-economy`      | **Sum every ledger entry per currency. A non-zero total pages a human.** |
| `recompute-leaderboards` | Arena standings                                                          |

`reconcile-economy` is the most important job in the eventual system. An economy bug found by
reconciliation on day one is a bug; the same bug found by a player on day ninety is an
incident, a rollback and a trust problem.

---

## Contract

Every job must be:

- **Idempotent** — it will run twice.
- **Retryable** — with exponential backoff and jitter.
- **Bounded** — no unbounded scan, no unbounded loop.
- **Observable** — structured logs carrying the correlation id.
- **Dead-letter capable** — never dropped, never retried forever.
- **Crash-safe** — a worker killed mid-job must not leave partial state.

```ts
// Default options, and why each value is what it is.
attempts: 5,
backoff: { type: 'exponential', delay: 1000 },
removeOnComplete: { count: 1000 },   // bounded: `false` grows Redis until it dies
removeOnFail:     { count: 5000 },   // failures kept longer — they get investigated
```

### Never

- **Never use an in-memory timer for durable game state.** A `setTimeout` for an expedition is
  lost on restart, and the player's expedition never completes.
- Never trust client-supplied time.
- Never make a job non-idempotent.
- Never let an analytics job block gameplay.

---

## Slice scope

**No jobs are implemented in the first vertical slice.**

The slice's battle resolution is fully synchronous: the player presses a button, the server
resolves and persists everything in one transaction, and returns the result. Nothing needs to
happen later.

Outbox rows **are** written, so the events exist from the first write. `outbox-relay` is the
next processor to build, and it is the first item in the post-slice backlog.

Related: [EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md) ·
[DOMAIN_EVENT_CATALOG.md](DOMAIN_EVENT_CATALOG.md)
