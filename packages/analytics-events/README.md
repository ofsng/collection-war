# Analytics Events — `@collection-war/analytics-events`

> **Status:** Contract implemented and tested (8 tests). **No gameplay events defined.**

## Responsibility

The typed, versioned analytics event contract shared by clients, the API and (eventually) the warehouse.

## Public interface

- `ANALYTICS_EVENTS` — the event-name constants
- `analyticsEnvelopeSchema` · `analyticsPayloadSchemas`
- `parseAnalyticsEvent(input)` — validates on ingest

## Allowed dependencies

- `@collection-war/shared-types`, `validation`
- Zod

## Forbidden dependencies

- Every other workspace package
- Any framework
- Anything that sends data anywhere — this is the contract, not the transport

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/analytics-events run build
pnpm --filter @collection-war/analytics-events run typecheck
pnpm --filter @collection-war/analytics-events run test
```

## Notes

- **Analytics is primarily a privacy surface.** Pseudonymous ids only — never an email, display name, IP, device id or precise location. A structural test fails if a field with such a name is added.
- **Once an event name ships it is permanent.** Renaming one splits its historical series in two, and no downstream SQL fully repairs that.
- Error **codes**, never messages — messages contain user data and change wording between releases, which breaks grouping as well as leaking.

## Ownership

Product + security.
