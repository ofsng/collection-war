# Domain: Analytics

> **Tier 3 — Supporting.** Status: **CONTRACT IMPLEMENTED, domain not implemented.**
> Date: 2026-07-28.

## 1. Purpose

Measure how the product is used, so decisions rest on evidence rather than intuition.

## 2. Responsibilities

- Defining the event contract shared by clients and server.
- Ingesting client events.
- Emitting server-side events.
- Forwarding to storage or a warehouse.
- Aggregations for product questions.

## 3. Owned data

| Table                  | Holds                                                 |
| ---------------------- | ----------------------------------------------------- |
| `analytics_events`     | Envelope plus payload, pseudonymous, time-partitioned |
| `analytics_aggregates` | Precomputed rollups for dashboards                    |

## 4. Public interface

```text
ingest(events: AnalyticsEvent[]) → Result<IngestResult>
emit(event: AnalyticsEvent, tx?) → Result<void>     // server-side
```

Ingest accepts a batch, because a mobile client should not make one request per event on a
mobile network.

## 5. Incoming dependencies

All three clients (via the API) · every server domain that emits events

## 6. Outgoing dependencies

None. Analytics is a **leaf consumer**, and must remain one — a domain that analytics depends
on is a domain whose failure could take down gameplay for a measurement.

## 7. Domain events

None published. Analytics consumes.

## 8. Security concerns

**Analytics is primarily a privacy surface, and only secondarily a data surface.**

- **Pseudonymous identifiers only.** `anonymousId` rotates on sign-out; `playerId` is
  optional and joined server-side, never client-side.
- **No personal data in any payload.** No email, display name, IP, device identifier or
  precise location. `events.test.ts` contains a structural guard that fails if a field with
  such a name is added — it cannot prove the absence of PII, but it catches the obvious
  additions during review.
- **Client input is untrusted.** Every event is validated on ingest; an unknown event name or
  a mismatched payload is dropped, not stored. An unvalidated ingest endpoint is both a
  data-quality problem and a storage-abuse vector.
- **Rate limiting.** Analytics ingest is the easiest endpoint to flood.
- **Error codes, never error messages.** Messages contain user data and change wording
  between releases, which breaks grouping as well as leaking.

## 9. Economy concerns

Analytics **observes** the economy and must never participate in it. It records that a
purchase happened; it never affects a balance.

Its value is in detecting economy problems early: a sudden change in currency velocity or
marketplace prices is usually the first visible symptom of a duplication bug.

## 10. Expected scaling pressure

The **highest event volume in the system by an order of magnitude**, and simultaneously the
**lowest priority**.

That combination drives the design: ingest is fire-and-forget from the client's perspective,
processing is asynchronous in the lowest-priority queue, and analytics must never block or
slow a player-facing request. If the analytics pipeline is down, players should not notice.

Storage is time-partitioned with a bounded retention window.

## 11. What this domain must never do

- Never contain personal data.
- Never affect gameplay, balances or any player-visible state.
- Never block a player-facing request.
- Never store an unvalidated event.
- Never be the source of truth for anything — it is a lossy, best-effort observation stream.
- Never be used to make an economy decision without cross-checking against the ledger, which
  is the authoritative record.

## Bootstrap status

`packages/analytics-events` implements the contract with 8 passing tests: a validated
envelope, five platform lifecycle events with per-event payload schemas, strict name-format
enforcement, and the PII structural guard.

**No gameplay analytics events are defined.** Designing them before the domains exist would
guarantee they measure the wrong things.

Related: [Observability architecture](../../architecture/OBSERVABILITY_ARCHITECTURE.md) ·
[Security rules](../../constitution/SECURITY_RULES.md)
