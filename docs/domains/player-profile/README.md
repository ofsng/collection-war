# Domain: Player Profile

> **Tier 3 — Supporting.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.

## 1. Purpose

The player's in-game persona: who they are _inside_ Collection War, as distinct from the
account that authenticates them.

## 2. Responsibilities

- Display name, avatar, and other public presentation.
- Player-level progression (account level, total experience).
- Preferences: locale, notification settings.
- Public profile visible to other players.
- Onboarding state.

## 3. Owned data

| Table                | Holds                                                                           |
| -------------------- | ------------------------------------------------------------------------------- |
| `players`            | `account_id`, display name, avatar, level, experience, created/updated, version |
| `player_preferences` | Locale, notification opt-ins                                                    |
| `player_stats`       | Denormalised counters for display (battles won, species collected)              |

`player_stats` is a **cache**. Every value in it must be recomputable from the owning domain,
and a reconciliation job must be able to verify it. A counter that cannot be recomputed is a
number nobody can defend.

## 4. Public interface

```text
createProfile(accountId, displayName) → Result<PlayerId>
getProfile(playerId) → Result<PlayerProfile>
getPublicProfile(playerId) → Result<PublicProfile>   // filtered for other players
updateDisplayName(playerId, name) → Result<void>
updatePreferences(playerId, prefs) → Result<void>
```

Two read methods on purpose. `getPublicProfile` returns a strictly smaller shape, so
"which fields are safe for another player to see" is a decision made in one place rather than
re-derived at every call site.

## 5. Incoming dependencies

Nearly everything — a `PlayerId` is the subject of most operations. Marketplace (seller
display name), social, arena (opponent display), administration.

## 6. Outgoing dependencies

`identity` (an account owns a profile) · `localization` (preference)

## 7. Domain events

`PlayerProfile.Created` · `PlayerProfile.DisplayNameChanged` · `PlayerProfile.LevelledUp` ·
`PlayerProfile.PreferencesChanged`

## 8. Security concerns

- **Display names are a moderation surface** — impersonation, offensive content, homoglyph
  attacks. Structural validation lives here; content moderation belongs to
  [administration](../administration/).
- **Public profile leakage.** `getPublicProfile` must never include an email address, an
  account id, a login time, or anything about the player's economy position.
- **Name-change abuse.** Rate-limited, and previous names retained for moderation history.
- **Enumeration.** Profile lookup by name must be rate-limited, or it becomes a scraping API.

## 9. Economy concerns

None directly. A display name is attached to marketplace listings, so impersonation of a
well-known trader is a **fraud vector** rather than merely a nuisance.

## 10. Expected scaling pressure

Read-heavy and highly cacheable — a profile is displayed far more often than it changes.
Marketplace and arena screens fetch many profiles at once, so a batch read
(`getProfiles(ids)`) matters more than a fast single read.

## 11. What this domain must never do

- Never hold credentials or authentication state — that is [identity](../identity/).
- Never hold currency balances — that is [economy](../economy/).
- Never expose account-level data through a public profile.
- Never allow a player to set a field that grants an advantage.
- Never treat `player_stats` as authoritative for anything other than display.

Related: [Identity](../identity/) · [Social](../social/) · [Administration](../administration/)
