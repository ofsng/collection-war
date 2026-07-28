# Glossary

> Audience: everyone. When a term here appears in code, documentation or a conversation, it
> means exactly this and nothing else.

A shared vocabulary is not pedantry. Two people using "creature" to mean different things
will design two incompatible systems and not discover it until integration.

---

## Product terms

**Collection War** — the official product name. Used everywhere: code, packages, database,
routes, documentation. No previous working title appears anywhere.

**Species** — a _definition_ in the creature catalogue. Authored content, versioned, shared
by every player. "Which creature is this?" `CreatureSpeciesId`.

**Owned creature** — a specific _instance_ a player owns, with its own level, history and
identity. "Whose creature is this, and what has happened to it?" `OwnedCreatureId`.

> Keeping these two separate is the single most important modelling decision in the game
> domain. Merging them makes per-player state impossible to version against catalogue
> changes.

**Team** — an ordered set of owned creatures a player takes into battle.

**Expedition** — a timed exploration that completes server-side and yields materials.

**Habitat** — a player-managed space producing passive value over time. Not in the MVP.

**Collection catalogue** — the record of which species a player has ever owned. Ownership
transferring away does not erase it.

**Exhibition** — a curated, displayable arrangement of a collection. Not in the MVP.

---

## Economy terms

**Wallet / ledger account** — a balance-bearing account. Not always a player's: escrow,
platform revenue, faucet and sink accounts exist too.

**Ledger entry** — one immutable side of one movement. Append-only.

**Transfer** — the set of entries making up a single movement. Must balance to zero.

**Faucet** — where currency enters the economy. **Sink** — where it leaves.

**Escrow** — an account holding an asset while a marketplace transaction is in progress, so
ownership is never ambiguous.

**Settlement** — crediting a seller after a completed sale.

**Minor units** — the smallest indivisible amount of a currency, as an integer. 1 gold = 1
unit (precision 0); 1 TRY = 100 kuruş (precision 2).

**Basis point (bp)** — one hundredth of a percent. A 2.5% fee is 250 bp. Rates are basis
points so rounding is explicit rather than floating-point.

**Currency kind** — `SOFT` · `PREMIUM` · `PROMO` · `FIAT`. Never interchangeable. See
[economy integrity rules](../constitution/ECONOMY_INTEGRITY_RULES.md#e1-currency-kinds-are-separate-and-never-convert-implicitly).

---

## Technical terms

**Server-authoritative** — the server computes the value; the client displays it. The
foundational rule of this system.

**Domain** — a bounded context with its own data, rules and interface. Roughly one module.
See [domain map](../domains/DOMAIN_MAP.md).

**Shared kernel** — the small set of types every domain may share. Deliberately tiny. See
[shared kernel](../domains/SHARED_KERNEL.md).

**Modular monolith** — one deployable process, strict internal module boundaries. See
[ADR-0005](../adr/ADR-0005-modular-monolith.md).

**Unit of work** — one transaction. Everything inside commits together or not at all.

**Outbox** — a table written inside a business transaction, holding events a relay process
delivers afterwards. Makes "committed but never notified" impossible.

**Idempotency key** — a client-supplied key making a write safe to retry. A retry returns
the original result rather than repeating the work.

**Correlation id** — an identifier threaded through a request, its jobs and its logs so one
player action can be reconstructed end to end.

**Optimistic concurrency** — a write carries the version it read; the database rejects it if
the row moved. Prevents lost updates without long-held locks.

**Soft delete** — marking a record deleted rather than removing it. Recoverable and
investigable.

**Content version** — an identifier for the authored game data an outcome was computed
under. Recorded with the outcome so it can be replayed correctly.

**Engine version** — the version of the battle rules that produced a result. Separate from
content version: rules and numbers change independently.

**Deterministic** — same inputs and same seed produce the same output, always, on any
machine. Requires an injected clock and a seeded random source.

**Seed** — the value initialising a random sequence. Persisted with any outcome it produced,
so the outcome can be replayed.

**Cursor pagination** — paging by an opaque server-issued cursor rather than an offset. See
[API architecture](../architecture/API_ARCHITECTURE.md#pagination).

**Liveness vs readiness** — liveness asks "is this process alive?" (never touches a
dependency); readiness asks "can it serve traffic?" (does). Conflating them causes restart
loops.

---

## Environments

**`local`** — a developer's machine. Docker Compose infrastructure. No real data, ever.

**`development`** — a shared hosted environment, when one exists. Not yet created.

**`staging`** — production-shaped, production-like data volume, no real players.

**`production`** — real players, real data. Does not exist yet.

> `COLLECTION_WAR_ENV` is separate from `NODE_ENV` on purpose: a production-mode _build_ can
> run against a development _environment_, and the application must be able to tell.

---

## Naming conventions

| Context               | Form                       | Example                   |
| --------------------- | -------------------------- | ------------------------- |
| Product name          | Title Case                 | `Collection War`          |
| Repository / folder   | kebab-case                 | `collection-war`          |
| Package scope         | scoped kebab               | `@collection-war/domain`  |
| Technical namespace   | snake_case                 | `collection_war`          |
| Database, DB user     | snake_case                 | `collection_war`          |
| Environment variables | SCREAMING_SNAKE            | `DATABASE_URL`            |
| API routes            | lowercase, versioned       | `/api/v1/system/info`     |
| Domain events         | `Domain.SubjectVerbedPast` | `Marketplace.ListingSold` |
| Analytics events      | `domain.subject.verb_past` | `session.locale.changed`  |
| Queues                | kebab-case                 | `outbox-relay`            |
| Task ids              | `CW-NNNN`                  | `CW-0001`                 |
| ADR ids               | `ADR-NNNN`                 | `ADR-0005`                |
