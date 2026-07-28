# Domain: Audit

> **Tier 1 — Critical.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.

## 1. Purpose

An immutable record of who did what, when, and why — sufficient to reconstruct any sensitive
operation months later, by someone who was not there.

## 2. Responsibilities

- Recording auditable operations.
- Preserving them immutably.
- Querying them for support, dispute resolution and compliance.
- Retention and archival.

## 3. Owned data

| Table           | Holds                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `audit_records` | Actor, action, target type and id, before/after summary, justification, correlation id, timestamp |

**Append-only. No `UPDATE`. No `DELETE`.** Enforced at the interface (there is no update
method) and, in a hosted environment, at the database-role level — the application's role
should not hold `UPDATE` or `DELETE` on this table at all.

## 4. Public interface

```text
record(entry: AuditEntry, tx) → Result<void>
query(filter, page) → Result<CursorPage<AuditRecord>>
getForTarget(targetType, targetId, page) → Result<CursorPage<AuditRecord>>
getForActor(actorId, page) → Result<CursorPage<AuditRecord>>
```

There is deliberately **no** `update` and **no** `delete`. The absence is the design.

## 5. Incoming dependencies

`economy` · `marketplace` · `owned-creatures` · `identity` · `administration` · `inventory`

Everything with financial, ownership or privilege significance.

## 6. Outgoing dependencies

**None.**

This is deliberate and important: audit must not depend on the domains it audits. A
dependency would create a cycle, and worse, it would mean a failure in an audited domain
could prevent its own auditing.

## 7. Domain events

None. Audit **consumes**; it does not publish. Publishing an event about an audit record
would invite an audit-of-the-audit, which is a loop with no natural end.

## 8. Security concerns

- **Tamper resistance.** Append-only at the interface, and enforced by database permissions
  in any hosted environment. An audit log the application can rewrite is not an audit log.
- **Completeness.** A missing record is worse than a wrong one, because its absence is
  invisible. Audit writes happen **inside the same transaction** as the operation they
  describe — so an operation that commits without its audit record is impossible.
- **Audit records contain sensitive data**, so reading them is itself privileged and itself
  audited.
- **No secrets in audit records.** A "password changed" record notes that it happened. It
  never contains the password, old or new.
- **Personal data in audit records** conflicts with erasure requests. The resolution — which
  fields are pseudonymised on erasure and which are retained as legal records — is a decision
  that must be made deliberately, not discovered during a request.

## 9. Economy concerns

Audit records are the **evidence** for every economy dispute. Without them:

- "my gold disappeared" is unanswerable;
- an administrative adjustment is indistinguishable from an exploit;
- reconciliation can detect that value is wrong but not how it became wrong.

The ledger records _what moved_. Audit records _who caused it and why_. Both are needed, and
neither substitutes for the other.

## 10. Expected scaling pressure

Write-heavy, append-only, and it never shrinks.

Response: time-based partitioning (natural for append-only, time-ordered data); archive old
partitions to object storage rather than deleting; index on the query patterns that actually
matter — by target, by actor, by correlation id — and nothing else, because every index
slows the write path.

## 11. What this domain must never do

- **Never update or delete a record.**
- Never depend on a domain it audits.
- Never fail silently — a failed audit write must fail its transaction.
- Never store a secret, a token or a password.
- Never allow unaudited read access.
- Never be optional for a Tier 1 operation.

Related: [Economy](../economy/) · [Administration](../administration/) ·
[Data architecture](../../architecture/DATA_ARCHITECTURE.md)
