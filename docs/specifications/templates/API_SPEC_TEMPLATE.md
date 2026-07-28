# API Specification: <Domain / Feature>

- **Status:** Draft | In review | Approved | Implemented
- **Date:** YYYY-MM-DD
- **API version:** v1

> Conventions that apply to every endpoint — error shape, pagination, correlation ids —
> live in [API architecture](../../architecture/API_ARCHITECTURE.md). **Do not restate
> them here.** Specify only what is specific to these endpoints.

---

## Endpoints

### `<METHOD> /api/v1/<path>`

**Purpose:** one sentence.

**Authentication:** required | optional | none
**Authorization:** which role or ownership check, and where it happens
**Idempotency key:** required | not applicable
**Rate limit:** class, and why
**Isolation level:** if it writes

#### Request

```ts
// Zod schema, or the exact shape
{
}
```

| Field | Type | Required | Constraints |
| ----- | ---- | -------- | ----------- |

#### Response — success

```json
{}
```

Status: `200` | `201` | `204`

#### Response — errors

| Status | `code`               | When                                 |
| ------ | -------------------- | ------------------------------------ |
| 400    | `VALIDATION_FAILED`  |                                      |
| 401    | `UNAUTHENTICATED`    |                                      |
| 403    | `FORBIDDEN`          |                                      |
| 404    | `RESOURCE_NOT_FOUND` | Not found **or not the requester's** |
| 409    |                      |                                      |
| 422    |                      |                                      |
| 429    | `RATE_LIMITED`       |                                      |

#### Behaviour

What the server does, in order. Every authorization check, every state change, every event
published.

#### Idempotency

If this mutates economy state: what the key scopes to, and what a retry returns.

#### Examples

```http
POST /api/v1/... HTTP/1.1
Authorization: Bearer <token>
Idempotency-Key: <key>
Content-Type: application/json

{ }
```

---

## Client impact

- [ ] `@collection-war/api-client` updated
- [ ] Response schema added and **parsed**, not cast
- [ ] Error codes handled by the calling screens
- [ ] Error messages have translation keys in both locales

## Compatibility

- [ ] Is this a breaking change? If yes, it needs a new API version — **a released mobile
      build cannot be updated in lockstep.**
- [ ] Are added fields optional?
- [ ] Do old clients still work?

## Testing

- [ ] Success path
- [ ] Each error path
- [ ] Authorization: unauthenticated, wrong role, not the owner
- [ ] Idempotency: a retry returns the original result
- [ ] Concurrency, where relevant
- [ ] Rate limiting

## Open questions
