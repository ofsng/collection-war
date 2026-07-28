# Rule: Backend (api, workers)

**Canonical:** [API_ARCHITECTURE.md](../../docs/architecture/API_ARCHITECTURE.md) ·
[COMPONENT_ARCHITECTURE.md](../../docs/architecture/COMPONENT_ARCHITECTURE.md) ·
[EVENT_ARCHITECTURE.md](../../docs/architecture/EVENT_ARCHITECTURE.md)

---

## Layering

| Layer          | Does                                      | Must not                           |
| -------------- | ----------------------------------------- | ---------------------------------- |
| Controller     | Parse, delegate, map the response         | Contain a business rule            |
| Service        | Authorize, transact, orchestrate, publish | Contain a domain rule              |
| Domain package | The rules                                 | Touch I/O, a framework, or a clock |
| Repository     | SQL                                       | Be called from a controller        |

If a controller decides whether a player can afford something, that rule is now untestable
without HTTP and invisible to the worker that also needs it.

## Every mutating endpoint

- [ ] Input parsed against a schema
- [ ] Authorization checked server-side, per operation
- [ ] Ownership re-verified **at the point of change**
- [ ] Inside a transaction
- [ ] Idempotency key if it touches value
- [ ] Audit record if it touches value or privilege
- [ ] Errors use the standard shape — no internal detail

## NestJS specifics

**Do not convert a constructor-parameter import to `import type`.** Nest reads
`design:paramtypes` metadata; a type-only import is erased and the dependency arrives
`undefined` at runtime. `@typescript-eslint/consistent-type-imports` is off for `apps/api`
for exactly this reason.

**Tests construct classes directly**, not through the Nest container — Vitest's esbuild
transform does not emit decorator metadata. See
[TESTING.md](../../docs/runbooks/TESTING.md).

## Workers

No job processors are registered yet, deliberately. The first will be the outbox relay.

Side effects belong in workers, reached through the outbox — never inline in a transaction.
A rolled-back transaction cannot un-send an email.

## Never

- Trust a client-supplied value, time, or identifier
- Perform an external side effect inside a transaction
- Return a stack trace, SQL or hostname to a client
- Use `console` — use `@collection-war/observability`
