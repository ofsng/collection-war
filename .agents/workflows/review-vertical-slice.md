# Workflow: `/review-vertical-slice`

**Purpose:** review a completed slice across every layer it touched.

## Run these first

```bash
pnpm verify
```

**If it did not pass, the review stops here.** There is nothing to review yet.

## Layer by layer

### Data

- [ ] Conventions: UUIDv7 · `timestamptz` server-generated · soft delete · `version`
- [ ] Foreign keys indexed
- [ ] Migration is safe on a live database, and the **generated SQL was read**
- [ ] The previous application version still works against the schema

### Domain

- [ ] No framework, transport or storage import
- [ ] No `Date.now()`, no `Math.random()`
- [ ] Invariants enforced inside the aggregate
- [ ] Expected failures returned as `Result`, not thrown

### Application

- [ ] Authorization server-side, per operation
- [ ] **Ownership re-verified at the point of change**
- [ ] One transaction, right isolation level
- [ ] Idempotency key on any value-moving write
- [ ] Side effects through the outbox

### API

- [ ] Input parsed against a schema
- [ ] No business rules in the controller
- [ ] Standard error shape; **no internal detail**
- [ ] A non-owned resource returns **404, not 403**

### Client

- [ ] Uses `@collection-war/api-client` — no direct `fetch`
- [ ] Responses parsed, not cast
- [ ] Loading, empty and **error** states exist
- [ ] Every string from `t(key)`, in both locales
- [ ] Accessible: semantics · labels · focus · not colour-only · announced

### Tests

- [ ] Success path
- [ ] **Every error path**
- [ ] Authorization: unauthenticated · wrong role · **not the owner**
- [ ] Economy: **retry** and **concurrency**
- [ ] Named for behaviour, not implementation

## Also run

- `/security-review` if it touches auth, an endpoint, uploads, or personal data
- `/economy-review` — **mandatory** if it touches value

## Output

**Approve** or **reject**, with specific required fixes. Not "looks good".

For each finding: what is wrong · why it matters · what specifically to do.
