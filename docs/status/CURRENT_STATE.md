# Current State

> **Date: 2026-07-28.** Perishable — treat anything here as stale unless the date is recent.
> Audience: anyone about to plan work. **Read this before assuming anything exists.**

---

## In one paragraph

**Collection War is playable.** A player can register, choose a language, choose one of three
starters, build a team, fight a server-resolved battle, receive experience and materials, level
up, and see identical state from a second client. The battle engine is deterministic and
versioned; rewards are idempotent; ownership is re-verified inside every write. All of that is
proven by **54 integration tests against real PostgreSQL**, which now run without Docker via
PGlite. What is **not** built: everything beyond the first loop — evolution, marketplace, the
economy ledger, arena, exploration, crafting, and the mobile game screens.

---

## Verified by execution

| Item                          | Evidence                                                                |
| ----------------------------- | ----------------------------------------------------------------------- |
| **`pnpm verify`**             | ✅ format · lint · typecheck · test · build                             |
| **Unit tests**                | ✅ **292** across 19 projects                                           |
| **Integration tests**         | ✅ **54** against real PostgreSQL (19 schema + 35 slice)                |
| **Battle determinism**        | ✅ identical result across 20 resolutions; 200 seeds all terminate      |
| **The full loop**             | ✅ register → starter → team → battle → rewards → level-up, in one test |
| **Cross-client state**        | ✅ a second login sees the same creature, level, materials and locale   |
| **Reward replay safety**      | ✅ retrying a battle returns the original and grants nothing extra      |
| **Double-starter prevention** | ✅ rejected both by idempotency key and by a second distinct request    |
| **Cross-player access**       | ✅ another player's creature and battle both return 404                 |
| **Refresh-token reuse**       | ✅ revokes the entire token family                                      |
| **No user enumeration**       | ✅ unknown account and wrong password return identical errors           |
| **Database constraints**      | ✅ all nine correctness constraints verified against PostgreSQL         |
| **Locale persistence**        | ✅ server-side; survives re-login                                       |
| **Localization completeness** | ✅ failing test; both locales complete                                  |
| **Web app**                   | ✅ typechecks, builds, playable loop implemented                        |

## Exists but NOT verified

| Item                                          | Why                         | Consequence                                                                               |
| --------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| **Concurrency**                               | PGlite is single-connection | Two simultaneous starter grants, real `40001` retries and pool behaviour are **untested** |
| **The API over HTTP against a real database** | No Docker                   | The services are proven directly; only health endpoints were ever exercised over HTTP     |
| **Docker Compose**                            | Not installed               | Never started                                                                             |
| **Mobile game screens**                       | Not built this phase        | Mobile still has only the health screen                                                   |
| **CI**                                        | Never run                   | Workflows unexercised                                                                     |
| **E2E (Playwright)**                          | Browsers not installed      | Harness configured, **no tests written**                                                  |

## Does not exist

**Gameplay beyond the first loop:** evolution · stars · potential · personalities ·
variations · bond · care · habitats · exploration · crafting · marketplace · arena · quests ·
collection catalogue · social.

**Systems:** the economy ledger (**no currency exists at all**) · rate limiting · the outbox
relay worker (events are written, nothing consumes them) · admin UI · WebSockets · push.

**Content:** 3 of 60 species · 4 of 80 materials · 3 nodes · 1 of 4 biomes.

---

## What is built, precisely

### Game systems

| System               | State                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------- |
| **Identity**         | ✅ scrypt hashing, access + rotating refresh tokens with reuse detection, no enumeration    |
| **Player profile**   | ✅ display name, server-side locale                                                         |
| **Creature catalog** | ✅ versioned species, abilities, growth curves                                              |
| **Owned creatures**  | ✅ starter grant (once ever), list, derived stats, append-only history                      |
| **Teams**            | ✅ ownership-validated membership, slot and duplicate constraints                           |
| **Battle engine**    | ✅ deterministic, 3v3-capable, versioned ruleset, elements, energy, crits, Burn, replay log |
| **PvE**              | ✅ 3 nodes, server-enforced unlock gating, progress tracking                                |
| **Rewards**          | ✅ seeded drops, idempotent grants, inventory history                                       |
| **Inventory**        | ✅ transactional grant/consume, `CHECK (quantity >= 0)`                                     |
| **Progression**      | ✅ quadratic curve, material gates, one level per call                                      |

### Packages changed this phase

| Package         | Added                                                        |
| --------------- | ------------------------------------------------------------ |
| `domain`        | Game rules: stats, elements, progression, rewards (53 tests) |
| `battle-engine` | Real deterministic engine + versioned ruleset (23 tests)     |
| `database`      | 12 game tables, migration, PGlite harness, content loader    |
| `api-client`    | Full game API surface, schema-parsed                         |
| `localization`  | Game and content keys, both locales complete                 |

### Applications

| App       | State                                                                       |
| --------- | --------------------------------------------------------------------------- |
| `api`     | ✅ auth + full game API, 12 endpoints                                       |
| `web`     | ✅ **playable**: register, locale, starter, team, battle, rewards, level-up |
| `admin`   | Unchanged — the guard still denies everything                               |
| `mobile`  | **Unchanged — health screen only. No game screens.**                        |
| `workers` | Unchanged — no processors registered                                        |

---

## The next task

1. **Mobile game screens** — the loop is only cross-platform on paper until they exist.
2. **The outbox relay worker** — events are written and nothing reads them.
3. **Concurrency verification on real PostgreSQL** — required before any economy work.
4. **Rate limiting** — required before real users.

Then Phase 3: potential, personalities, evolution and stars.

---

Related: [Game implementation readiness](GAME_IMPLEMENTATION_READINESS.md) ·
[CW-0100](../tasks/active/CW-0100-game-architecture-and-first-vertical-slice.md) ·
[Risks](RISKS.md) · [Deferred work](DEFERRED_WORK.md)
