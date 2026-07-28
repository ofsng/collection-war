# Rule: Web and Admin

**Canonical:** [COMPONENT_ARCHITECTURE.md](../../docs/architecture/COMPONENT_ARCHITECTURE.md) ·
[LOCALIZATION_ARCHITECTURE.md](../../docs/architecture/LOCALIZATION_ARCHITECTURE.md) ·
[ADR-0006](../../docs/adr/ADR-0006-nextjs-for-web.md)

---

## Rules

**The API client is the only path to the server.** Never `fetch` the API directly — the
shared client centralises correlation ids, the error shape, idempotency keys, timeouts and
response parsing.

**Server state and UI state are different.** TanStack Query owns anything the server knows
(balances, inventory, listings). React state owns only what the server does not care about.
Putting a balance in React state creates a second, wrong copy.

**Create the `QueryClient` inside `useState`, never at module scope.** A module-level client
is shared across every request during server rendering, which means one player's cached data
can be served to another.

**No literal user-facing text.** Every string comes from `t(key)`. Two commented exceptions
exist — `error.tsx` and `loading.tsx` — because they must render even when the locale
provider is what failed.

**Responses are parsed, not cast.** `as SomeType` compiles happily against a server that
changed its contract.

## Accessibility, not optional

- Real semantic elements. Never a clickable `<div>`.
- Every control labelled.
- Focus visible — never `outline: none`.
- Status never conveyed by colour alone.
- Loading and error states announced (`role="status"`, `aria-live`).

## Admin is stricter

Route guards run on the **server**, in a server component, before any protected content is
rendered. Hiding content with CSS is not access control.

`requireAdmin` currently denies everything, and a test asserts it. **Do not add a placeholder
session** — a fake login that works gets forgotten and ships.

## Never

- Import `@collection-war/database`, `pg`, `ioredis`, `bullmq` or `drizzle-orm`
- Put a secret behind `NEXT_PUBLIC_`
- Use `dangerouslySetInnerHTML` with anything a user can influence
- Compute a value the server should decide
