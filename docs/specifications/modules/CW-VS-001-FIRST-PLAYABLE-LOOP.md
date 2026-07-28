# CW-VS-001: First playable loop

- **Status:** Approved (self-reviewed — see [review](#review))
- **Date:** 2026-07-28
- **Task:** [CW-0100](../../tasks/active/CW-0100-game-architecture-and-first-vertical-slice.md)

---

## 1. Problem

Nothing in Collection War is playable. Every architectural claim — server authority,
determinism, transactional integrity, cross-client sync — is a claim about documents.

One thin complete loop turns all of them into claims about a running system.

## 2. Goals

A real player can: register → choose a language → choose a starter → build a team → fight a
battle the server resolves → receive experience and a material → level up → and see the exact
same state from a different client.

## 3. Non-goals

Evolution · stars · potential · personalities · variations · bond · care · habitats ·
exploration · crafting · marketplace · arena · quests · **currency of any kind** · the ledger ·
social · species 4–60 · materials 5–80 · biomes 2–4 · chapters 2–20 · admin UI · rate
limiting · the outbox relay · WebSockets.

## 4. Player-visible behaviour

| Step     | Happy path                                  | Unhappy paths                                                                        |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Register | Account + profile created, signed in        | Email taken → **generic message** · weak password → specific · offline → retry       |
| Locale   | Turkish or English; persists across clients | Save fails → keep local, show error                                                  |
| Starter  | Three localized cards; pick one             | Already has one → shown their creature, not an error · double-tap → **one creature** |
| Team     | Starter assigned to slot 1                  | Not owned → 404 · duplicate slot → 400                                               |
| Battle   | Tap Fight → animated replay → result        | Not your team → 404 · retry → **same battle, same result**                           |
| Rewards  | Experience + material, itemised             | Retry → no second grant                                                              |
| Level up | Costs materials; stats rise                 | Insufficient experience or materials → specific error · stale version → re-read      |

## 5. Domains

`identity` · `player-profile` · `creature-catalog` · `owned-creatures` · `teams` · `battle` ·
`pve` · `inventory`. Ownership per
[GAME_STATE_OWNERSHIP.md](../../architecture/GAME_STATE_OWNERSHIP.md).

## 6. Server behaviour

Every decision is the server's:

- password hashing and verification (scrypt, [ADR-0026](../../adr/ADR-0026-scrypt-password-hashing.md));
- which creature a starter grant produces, and that it happens **once ever**;
- the battle seed, generated with `randomBytes`;
- turn order, damage, status, and the outcome;
- experience and material quantities, from the encounter's reward table;
- whether a level-up is permitted, and the resulting stats.

**No endpoint accepts an outcome, a stat, a reward or a seed.**

## 7. Data model

New tables, all owned per the ownership table:

```text
users(id, email UNIQUE, password_hash, email_verified, status, created_at, updated_at)
user_sessions(id, user_id, refresh_token_hash UNIQUE, family_id, used, expires_at, ...)
player_profiles(id, user_id UNIQUE, display_name, locale, account_level, experience,
                starter_granted_at, version, created_at, updated_at)

creature_species(id, slug UNIQUE per version, content_version, name_key, description_key,
                 element, class, rarity, base_* stats, growth_*, art_key)
species_abilities(id, species_id, slug, name_key, kind, power_bp, energy_cost, ...)

owned_creatures(id, player_id, species_id, nickname, level, experience, locked, favorite,
                acquired_via, acquired_at, content_version, version, deleted_at, ...)
creature_history(id, creature_id, event_type, data, occurred_at)          -- append-only

teams(id, player_id, name, version, ...)
team_members(team_id, slot, creature_id)                                   -- UNIQUE(team,slot)
                                                                           -- UNIQUE(team,creature)
material_definitions(id, slug UNIQUE per version, content_version, name_key, category, rarity)
material_inventory(id, player_id, material_id, quantity CHECK >= 0, version)
                                                                           -- UNIQUE(player,material)
inventory_transactions(id, player_id, material_id, delta, reason, source_type, source_id,
                       idempotency_key, occurred_at)                       -- append-only

pve_nodes(id, slug, chapter_slug, content_version, name_key, order_index, encounter_id)
encounters(id, slug, content_version, opponent_species_id, opponent_level, rewards jsonb)
player_pve_progress(id, player_id, node_id, cleared_at, best_outcome)      -- UNIQUE(player,node)

battle_sessions(id, player_id, node_id, seed, engine_version, content_version, outcome,
                turn_count, events jsonb, created_at)                      -- immutable
```

Full detail: [CW-VS-001-DATA-MODEL.md](CW-VS-001-DATA-MODEL.md).

## 8. API surface

Per [AUTHORIZATION_MATRIX.md](../../architecture/AUTHORIZATION_MATRIX.md):

```text
POST /api/v1/auth/register            —    generic response on conflict
POST /api/v1/auth/login               —
POST /api/v1/auth/refresh             —    rotating; reuse revokes the family
POST /api/v1/auth/logout              P
GET  /api/v1/profile                  P
PUT  /api/v1/profile/settings/locale  P
GET  /api/v1/catalog/species          —    content-versioned
GET  /api/v1/catalog/starters         —
POST /api/v1/creatures/starter        P    idempotent · once per player ever
GET  /api/v1/creatures                P    own only
GET  /api/v1/creatures/:id            P    404 if not owned
POST /api/v1/creatures/:id/level-up   P    idempotent · consumes materials
GET  /api/v1/teams                    P
PUT  /api/v1/teams/active             P    validates ownership of every member
GET  /api/v1/pve/nodes                P    progress merged
POST /api/v1/pve/nodes/:id/battles    P    idempotent · server seeds
GET  /api/v1/inventory                P
```

## 9. Events

Enqueued to the outbox inside their transactions:
`Identity.AccountRegistered` · `PlayerProfile.Created` · `PlayerProfile.LocaleChanged` ·
`OwnedCreatures.Acquired` · `Battle.Resolved` · `Inventory.ItemsGranted` ·
`Progression.ExperienceGranted` · `Progression.LevelReached`.

**Nothing consumes them yet** — the relay is not built. They are written now because
retrofitting an event stream means reconstructing history that was never recorded.

## 10. Economy impact

**None.** No currency exists in the slice, so the ledger is not exercised and cannot be got
wrong here.

Materials still get economy discipline — transactional, idempotent, append-only history —
because they become value later.

**Faucet:** battle rewards, capped by the encounter's table. **Sink:** level-up costs.
A player can repeat a node, so the faucet is bounded by time, not by uses. Acceptable at this
scale; a real cap arrives with energy.

## 11. Security

| Threat                  | Mitigation                                                               |
| ----------------------- | ------------------------------------------------------------------------ |
| Credential stuffing     | scrypt `N=2^16`; generic errors; **rate limiting deferred and recorded** |
| User enumeration        | Register and login return identical shapes and take similar time         |
| Token theft             | 15-min access; rotating refresh; **reuse revokes the family**            |
| Reward replay           | Idempotency key + unique index                                           |
| Double starter          | Idempotency + `starter_granted_at` + a partial unique index              |
| Cross-player access     | Ownership re-verified **inside** every write; 404 on miss                |
| Client-authored outcome | No endpoint accepts one                                                  |
| Negative inventory      | `CHECK (quantity >= 0)` — the database, not the application              |

## 12. Localization

Every string a key, in both locales. Species and material names are **content keys**
(`species.koruk.name`), never identifiers — the slug is the identifier. Catalogue
completeness stays a failing test.

## 13. Accessibility

Semantic elements · labelled controls · visible focus · non-colour element and rarity
indicators · 44pt touch targets · announced loading and error states.

## 14. Performance

Cursor pagination on creatures and inventory. Battle load is a bounded set of indexed reads —
no N+1. Content cached by version.

## 15. Testing

| Level                | Coverage                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Unit                 | scrypt round-trip · damage · turn order · determinism · level curve · reward computation                              |
| Property             | Battles terminate · health never negative · energy bounded                                                            |
| Integration (PGlite) | Register · duplicate starter · team validation · battle · **reward replay** · level-up · negative-inventory rejection |
| E2E                  | The full journey, plus **cross-client state**                                                                         |
| Security             | Unauthorised creature access · reward replay · invalid action                                                         |

## 16. Rollout

No flag — nothing is live. Migration is additive only. Content seeded as version
`2026.07.28-1`.

## 17. Open questions

1. **Should repeating a cleared node give reduced rewards?** Deferred — the slice grants full
   rewards, which is a known farm. Bounded by there being one battle and no currency.
2. **Level cap for the slice?** Set to 10, arbitrarily but explicitly, to keep the growth curve
   testable.
3. **Team size?** The release targets 3 active + 1 reserve; the slice ships **1 active**,
   because the player owns one creature. The engine supports up to 3 from the start.

---

## Review

Self-reviewed against the repository's own checklists, since no second reviewer is available.
Recording it as self-review rather than implying independent approval.

- **Architecture** ✅ Respects layers; no cross-module joins; engine stays pure.
- **Security** ✅ Auth is new and highest-risk; threats tabled above. ⚠️ **Rate limiting is
  absent** — accepted for a slice with no users, recorded in
  [RISKS.md](../../status/RISKS.md), required before any real user.
- **Economy** ✅ No currency; ledger untouched. ⚠️ Repeatable rewards are an unbounded faucet
  in principle — accepted, noted in open question 1.
- **Database** ✅ Additive; constraints in the database; ownership in the `WHERE`.
  ⚠️ **Concurrency untestable on PGlite** ([ADR-0025](../../adr/ADR-0025-pglite-for-integration-tests.md)).
- **Testability** ✅ Pure rules unit-tested; integration against real Postgres semantics.
