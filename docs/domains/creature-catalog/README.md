# Domain: Creature Catalog

> **Tier 3 — Supporting.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.

## 1. Purpose

The authored **definitions** of every creature species: what a creature _is_, before anyone
owns one.

## 2. Responsibilities

- Species definitions: base stats, type, rarity, art references, localized names.
- Content versioning of those definitions.
- Evolution and star-development _rules_ per species (the rules, not a player's progress).
- Serving the catalogue to clients efficiently.

## 3. Owned data

| Table                   | Holds                                                             |
| ----------------------- | ----------------------------------------------------------------- |
| `creature_species`      | Immutable per content version: base stats, rarity, type, art keys |
| `creature_species_text` | Localized name and description per locale                         |
| `content_versions`      | Version identifier, published-at, publisher                       |

**Rows are immutable per version.** Changing a species creates a new version row; it never
edits the existing one. A battle fought last month must replay under last month's numbers,
and an edited row makes that impossible.

## 4. Public interface

```text
getSpecies(speciesId, contentVersion?) → Result<Species>
listSpecies(filter, page) → Result<CursorPage<Species>>
getCurrentContentVersion() → ContentVersion
getEvolutionRules(speciesId) → Result<EvolutionRules>
```

`contentVersion` is optional and defaults to current — but it must be _possible_ to ask for
an old one, or replay and audit are impossible.

## 5. Incoming dependencies

`owned-creatures` (an instance references a species) · `battle` (stats) ·
`progression` (evolution rules) · `collection` (completion) · `marketplace` (display) ·
`pve` (opponents)

## 6. Outgoing dependencies

`localization` (names and descriptions) · storage (art assets)

Nothing else. The catalogue is authored content and must not depend on player state.

## 7. Domain events

`CreatureCatalog.ContentVersionPublished` · `CreatureCatalog.SpeciesAdded`

Note the absence of `SpeciesUpdated`: a change is a new version, not an update.

## 8. Security concerns

- **Write access is administrative only**, and audited. Editing base stats is equivalent to
  editing the balance of the entire game.
- **Art asset references** must be validated; a species pointing at an arbitrary URL is a
  content-injection vector on three clients.
- **Read access is public**, so the catalogue must not carry drop rates or internal tuning
  values that would let a player compute an advantage — those belong to the domain that uses
  them.

## 9. Economy concerns

Indirect and large. Rarity and stats determine marketplace value. **Publishing a content
version that changes a species' power silently repricies every listing of it** — which is why
version publication is an administrative action with an audit record, not a deploy.

## 10. Expected scaling pressure

Read-heavy, almost never written, identical for every player — the ideal cache candidate. A
client can hold the whole catalogue for a content version and revalidate by version
identifier rather than re-fetching.

## 11. What this domain must never do

- Never hold player-specific state. A species is not an owned creature.
- Never mutate a published version.
- Never let a client choose which version applies to an outcome — the server decides.
- Never expose internal tuning (drop weights, matchmaking values) through the public read.
- Never depend on a player-facing domain.

Related: [Owned creatures](../owned-creatures/) · [Progression](../progression/) ·
[Data architecture](../../architecture/DATA_ARCHITECTURE.md#content-versioning)
