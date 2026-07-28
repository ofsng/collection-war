# Domain Specification: <Name>

- **Status:** Draft | In review | Approved | Implemented
- **Date:** YYYY-MM-DD
- **Integrity tier:** 1 (Critical) | 2 (Core) | 3 (Supporting)
- **Author / Reviewers:**

> The [domain document](../../domains/) states the boundary. This states enough detail to
> build from.

---

## 1. Purpose

One sentence. If it needs "and", consider whether this is two domains.

## 2. Ubiquitous language

| Term | Means exactly | Does NOT mean |
| ---- | ------------- | ------------- |
|      |               |               |

Add anything new to the [glossary](../../product/GLOSSARY.md).

## 3. Aggregates and invariants

For each aggregate: what it is, what it owns, and **the rules that must always hold**.

```text
Aggregate: <name>
Root: <entity>
Invariants:
  - <rule that must never be violated>
```

Invariants are the reason the aggregate has a boundary. State them precisely enough to test.

## 4. Owned data

Tables, with ownership stated. Reference the [data model](DATA_MODEL_TEMPLATE.md) for detail.

**No other domain reads or writes these tables directly.**

## 5. Public interface

```ts
interface <Name>Service {
  // Every method: what it does, what it returns, what it can fail with.
  // Mutating methods take a transaction context and an idempotency key where required.
}
```

For each method:

| Method | Authorization | Transactional | Idempotent | Events published |
| ------ | ------------- | ------------- | ---------- | ---------------- |

## 6. Dependencies

**Incoming** — who calls this, and why.
**Outgoing** — what this calls, and why. Check it against
[dependency rules](../../architecture/DEPENDENCY_RULES.md).

## 7. Domain events

| Event | Version | Published when | Payload | Consumers |
| ----- | ------- | -------------- | ------- | --------- |

Names are `Domain.SubjectVerbedPast`. Consumers must be idempotent — delivery is
at-least-once.

## 8. State machines

Any entity with a lifecycle. A Mermaid `stateDiagram-v2` is usually clearest. **Terminal
states must be terminal.**

## 9. Authorization

| Operation | Who | Checked how |
| --------- | --- | ----------- |

Deny by default. Ownership is re-checked, never inferred from the request.

## 10. Economy impact

Required for any domain that touches value. Faucets, sinks, ledger accounts, isolation
levels, and which [economy integrity rules](../../constitution/ECONOMY_INTEGRITY_RULES.md)
apply.

## 11. Security

Reference the [threat model](THREAT_MODEL_TEMPLATE.md). Summarise the top three threats and
what stops them.

## 12. Failure behaviour

- What happens when a dependency is down?
- What is retried, and what is not?
- What must never be retried automatically?

## 13. Performance

Expected volume, hot paths, indexes, and the first thing that breaks under load.

## 14. Test strategy

What is unit-tested, what needs integration, what needs a real database, and which invariants
are executable.

## 15. What this domain must never do

The most useful section. State the boundary as **prohibitions** — a boundary described only
as capabilities always grows; one described as prohibitions is reviewable.

## 16. Open questions
