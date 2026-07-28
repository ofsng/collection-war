# Authorization Matrix

> Audience: anyone adding an endpoint. Date: 2026-07-28.
> Model and reasoning: [AUTHORIZATION_MODEL.md](../security/AUTHORIZATION_MODEL.md).
> This is the operation-by-operation table.

---

## Reading this table

Every operation passes three checks, in order:

1. **Authenticated?** → `401`
2. **Permitted?** (role) → `403`
3. **Entitled?** (owns _this_ resource) → **`404`, not `403`**

A `403` on a resource lookup confirms the resource exists, which is enumeration. The response
for "does not exist" and "not yours" is identical.

| Column   | Meaning                                                                     |
| -------- | --------------------------------------------------------------------------- |
| **Auth** | `—` none · `P` player · `A` admin role                                      |
| **Owns** | ✅ = ownership re-verified **inside the write**, not merely checked earlier |
| **Idem** | Idempotency key required                                                    |
| **Txn**  | Isolation: `RC` = READ COMMITTED · `SER` = SERIALIZABLE                     |

---

## Identity

| Operation             | Auth | Owns           | Idem | Txn | Notes                                                             |
| --------------------- | ---- | -------------- | ---- | --- | ----------------------------------------------------------------- |
| `POST /auth/register` | —    | —              | —    | RC  | **Identical response and timing** whether or not the email exists |
| `POST /auth/login`    | —    | —              | —    | —   | Rate-limited hardest; generic failure message                     |
| `POST /auth/refresh`  | —    | —              | —    | RC  | Rotates; **reuse revokes the whole family**                       |
| `POST /auth/logout`   | P    | ✅ own session | —    | RC  |                                                                   |
| `GET /auth/me`        | P    | —              | —    | —   |                                                                   |

## Player profile

| Operation                      | Auth | Owns | Idem | Txn |
| ------------------------------ | ---- | ---- | ---- | --- |
| `GET /profile`                 | P    | ✅   | —    | —   |
| `PATCH /profile`               | P    | ✅   | —    | RC  |
| `GET /profile/settings`        | P    | ✅   | —    | —   |
| `PUT /profile/settings/locale` | P    | ✅   | —    | RC  |
| `GET /profile/:id/public`      | —    | —    | —    | —   |

`GET /profile/:id/public` returns a **strictly smaller shape** — never email, account id, last
login, balances or anything about the player's economy position.

## Creature catalog — read-only to players

| Operation                     | Auth       | Owns | Idem | Txn |
| ----------------------------- | ---------- | ---- | ---- | --- |
| `GET /catalog/species`        | —          | —    | —    | —   |
| `GET /catalog/species/:id`    | —          | —    | —    | —   |
| `POST /admin/catalog/species` | A: content | —    | —    | RC  |
| `POST /admin/catalog/publish` | A: content | —    | —    | RC  |

Public reads must not expose internal tuning — drop weights, matchmaking values, unreleased
content.

## Owned creatures

| Operation                       | Auth | Owns | Idem   | Txn | Notes                        |
| ------------------------------- | ---- | ---- | ------ | --- | ---------------------------- |
| `GET /creatures`                | P    | ✅   | —      | —   | Own only, cursor-paginated   |
| `GET /creatures/:id`            | P    | ✅   | —      | —   | **404** if not owned         |
| `POST /creatures/starter`       | P    | —    | **✅** | RC  | Exactly one per player, ever |
| `PATCH /creatures/:id/nickname` | P    | ✅   | —      | RC  | Moderation surface           |
| `POST /creatures/:id/level-up`  | P    | ✅   | **✅** | RC  | Consumes materials           |
| `PUT /creatures/:id/favorite`   | P    | ✅   | —      | RC  |                              |
| `PUT /creatures/:id/lock`       | P    | ✅   | —      | RC  |                              |

## Teams

| Operation           | Auth | Owns                         | Idem | Txn |
| ------------------- | ---- | ---------------------------- | ---- | --- |
| `GET /teams`        | P    | ✅                           | —    | —   |
| `POST /teams`       | P    | ✅ every member              | —    | RC  |
| `PUT /teams/:id`    | P    | ✅ team **and** every member | —    | RC  |
| `DELETE /teams/:id` | P    | ✅                           | —    | RC  |

Membership validates that **every** creature is owned, unlocked and not duplicated within the
team.

## Battle and PvE

| Operation                     | Auth | Owns           | Idem   | Txn | Notes                         |
| ----------------------------- | ---- | -------------- | ------ | --- | ----------------------------- |
| `GET /pve/chapters`           | P    | —              | —      | —   | Player progress merged in     |
| `POST /pve/nodes/:id/battles` | P    | ✅ team        | **✅** | RC  | **Server generates the seed** |
| `GET /battles/:id`            | P    | ✅ participant | —      | —   | 404 if not a participant      |
| `GET /battles/:id/replay`     | P    | ✅ participant | —      | —   |                               |

There is **no** endpoint that accepts a battle outcome, a damage figure or a reward list.

## Inventory

| Operation        | Auth | Owns | Idem | Txn |
| ---------------- | ---- | ---- | ---- | --- |
| `GET /inventory` | P    | ✅   | —    | —   |
| `GET /materials` | —    | —    | —    | —   |

Inventory is never mutated by a direct endpoint. It changes only as a **consequence** of a
battle, a claim, a craft or a purchase — each of which is idempotent and audited.

## Administration

| Operation                          | Auth           | Justification | Audit |
| ---------------------------------- | -------------- | ------------- | ----- |
| `GET /admin/players/:id`           | A: support     | —             | ✅    |
| `POST /admin/players/:id/currency` | **A: economy** | **required**  | ✅    |
| `POST /admin/players/:id/sanction` | A: moderator   | required      | ✅    |
| `PUT /admin/feature-flags/:key`    | A: super       | required      | ✅    |
| `POST /admin/content/publish`      | A: content     | required      | ✅    |

Currency adjustment requires the **`economy`** role, not merely "admin" — most support work
needs no ability to create value. Admin currency changes go through the ledger like any other
movement; **there is no privileged path around the invariants.**

---

## Roles

| Role          | May                                    | May not                   |
| ------------- | -------------------------------------- | ------------------------- |
| `player`      | Act on own resources; read public data | Anything else             |
| `SUPPORT`     | Look up players, view state and audit  | Adjust currency, sanction |
| `MODERATOR`   | + sanctions, content moderation        | Adjust currency           |
| `ECONOMY`     | + currency and inventory adjustment    | Manage administrators     |
| `CONTENT`     | Author and publish content             | Player data               |
| `SUPER_ADMIN` | Everything                             | —                         |

---

## Rules for a new endpoint

1. **Add a row to this table before writing the handler.** An endpoint with no row is
   unreachable by default.
2. Deny by default.
3. Ownership is re-verified **in the write** (`WHERE player_id = ...`), never cached from an
   earlier check — a creature can be sold in between.
4. Not-owned returns **404**.
5. Anything that creates value or moves ownership requires an idempotency key.
6. Test all four cases: unauthenticated · wrong role · **not the owner** · owner.

The third and sixth are the ones that catch real bugs.

Related: [AUTHORIZATION_MODEL.md](../security/AUTHORIZATION_MODEL.md) ·
[API_ARCHITECTURE.md](API_ARCHITECTURE.md) ·
[ANTI_CHEAT_ARCHITECTURE.md](ANTI_CHEAT_ARCHITECTURE.md)
