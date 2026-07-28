# Workflow: `/implement-vertical-slice`

**Purpose:** build one thin, **complete** slice — database through API through UI — rather
than a layer at a time.

## Why vertical

A horizontal approach ("build all the repositories, then all the services") produces layers
that have never been exercised together, and the integration problems all arrive at the end,
simultaneously.

A vertical slice is a working thing, and the second slice is far cheaper because the path is
proven.

## Prerequisites

- [ ] An **approved** specification exists
- [ ] A task packet exists with allowed and forbidden files
- [ ] `/bootstrap-check` passes

**No approved specification means no implementation.** Say so and stop.

## Order

1. **Data model** — schema, migration. Read the generated SQL.
2. **Domain logic** — framework-free, in `packages/domain`. Tests first here; they are cheap
   and fast.
3. **Repository** — implementing the interface the domain declared.
4. **Application service** — authorize, transact, orchestrate, publish.
5. **API endpoint** — parse, delegate, map. No business rules.
6. **API client** — schema and method.
7. **UI** — including loading, empty and **error** states.
8. **Tests at every level.**
9. **Documentation**, in the same change.

## Keep it thin

One creature, one listing, one operation. Resist adding the second variant until the first
works end to end.

## Never

- **Implement gameplay before [CW-0002](../../docs/tasks/BACKLOG.md) is approved**
- Put business rules in a controller
- Trust a client-supplied value, time or identifier
- Move value without a transaction, an idempotency key and an audit record
- Hardcode user-facing text
- **Weaken a check to make it pass**

## Finish with

```bash
pnpm verify
```

Paste the real output. Then run `/review-vertical-slice`.
