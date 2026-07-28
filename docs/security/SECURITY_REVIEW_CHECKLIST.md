# Security Review Checklist

> Audience: reviewers. Date: 2026-07-28.
> Use the section that applies. Do not run the whole list on a typo fix.

---

## When a security review is required

| Change                                  | Review                                  |
| --------------------------------------- | --------------------------------------- |
| Currency, inventory, ownership, rewards | **Full**, including the economy section |
| Authentication or authorization         | **Full**                                |
| A new endpoint                          | Sections A, B, C                        |
| A new dependency                        | Section G                               |
| A schema change                         | Sections C, F                           |
| File upload                             | Section E                               |
| Admin capability                        | Sections B, H                           |
| UI-only, no new data                    | Section D                               |

---

## A. Input and output

- [ ] Every input parsed against a schema before use — `unknown` in, typed out
- [ ] Bounded: length, size, range, array count
- [ ] **The rejected payload is never echoed back** in an error
- [ ] No stack trace, SQL, hostname, path or dependency version in any client response
- [ ] Errors use the standard shape with a stable code
- [ ] Responses contain only what the caller is entitled to see

## B. Authorization

- [ ] Checked **server-side**
- [ ] Checked **per operation**, not per screen
- [ ] Deny by default
- [ ] **Ownership re-verified at the point of change**, not cached from an earlier check
- [ ] A non-owned resource returns **404, not 403**
- [ ] Admin operations require the specific role, not merely "admin"
- [ ] Admin operations are audited with the actor named
- [ ] Acting on a player's behalf is recorded as such
- [ ] Tested: unauthenticated · wrong role · **not the owner** · owner

## C. Data and state

- [ ] All state changes are transactional
- [ ] The isolation level is appropriate, and `SERIALIZABLE` where an invariant spans rows
- [ ] Optimistic concurrency on mutable rows
- [ ] Timestamps are server-generated
- [ ] Player-owned records are soft-deleted, not removed
- [ ] Uniqueness constraints are in the database, not only in application code

## D. Client

- [ ] No decision that affects state is made on the client
- [ ] No secret behind `NEXT_PUBLIC_` or `EXPO_PUBLIC_`
- [ ] No `dangerouslySetInnerHTML` with anything a user can influence
- [ ] Tokens in secure storage — `httpOnly` cookie or Keychain/Keystore, never `localStorage`
- [ ] No client-supplied time is trusted

## E. Uploads

- [ ] Validated by **content**, not extension or client-supplied MIME type
- [ ] Hard size limit enforced at the edge
- [ ] Stored in object storage with a generated name
- [ ] Served from a domain that carries **no session cookies**
- [ ] Never rendered as HTML

## F. Secrets

- [ ] No secret in the diff — including tests, fixtures and comments
- [ ] New configuration is validated at startup
- [ ] New secret key names match the redaction patterns
- [ ] No secret in a log line, an error, or an analytics event

## G. Dependencies

- [ ] Justified in the pull request: what, why, who maintains it
- [ ] Exact version pinned
- [ ] Lockfile change reviewed
- [ ] Any new `onlyBuiltDependencies` entry justified
- [ ] Transitive footprint checked with `pnpm why`

## H. Rate limiting and abuse

- [ ] Rate-limited, at a level matched to the risk
- [ ] Cannot be used to enumerate resources
- [ ] Cannot be used to enumerate accounts (registration, password reset)
- [ ] Bounded work per request — no unbounded loop, query or allocation
- [ ] Pagination limits are clamped, not trusted

---

## Economy section — **required** for anything touching value

- [ ] Balance changes go through **ledger entries**. No direct assignment anywhere.
- [ ] All amounts are **integer minor units**
- [ ] **Currency kinds are not mixed** in any transfer
- [ ] The whole operation is in **one transaction**
- [ ] `SERIALIZABLE` isolation for a listed operation
- [ ] An **idempotency key** is required, and enforced by a unique constraint
- [ ] A **retry returns the original result** — tested
- [ ] Concurrent access tested
- [ ] An **audit record** is written, with the actor
- [ ] No path lets a **random reward become withdrawable value**
- [ ] **Real-money withdrawal remains disabled**
- [ ] Reconciliation would detect a failure of this operation
- [ ] The relevant invariant exists as an **executable test**

> These are not suggestions. See
> [economy integrity rules](../constitution/ECONOMY_INTEGRITY_RULES.md).

---

## Questions worth asking out loud

Checklists catch what is known. These catch what is not:

1. **What would I try first if I wanted to exploit this?**
2. **What happens if this request is sent ten times simultaneously?**
3. **What happens if it is retried after a timeout?**
4. **What if the client lies about every value it sends?**
5. **What if the device clock is set to next year?**
6. **What is the maximum value extractable per hour by a determined attacker?**
7. **Would we notice? How?**
8. **What does this leak that it does not need to?**

Question 7 is the one most often skipped. Assume at least one mitigation will fail; detection
is what remains.

---

## Reviewer notes

**A checklist is a floor, not a ceiling.** Every box can be ticked on a design that is
fundamentally wrong.

**"Validated" is not a mitigation.** "The `(key, scope)` unique index rejects the second
insert, so a retried purchase returns the original order" is.

**Ask for the test.** A mitigation without a test is an intention.

Related: [Security rules](../constitution/SECURITY_RULES.md) ·
[Threat model](THREAT_MODEL.md) ·
[Economy integrity rules](../constitution/ECONOMY_INTEGRITY_RULES.md)
