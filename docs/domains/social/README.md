# Domain: Social

> **Tier 3 — Supporting.** Status: **PROPOSED, not implemented.** Not in the MVP.
> Date: 2026-07-28. Covers domain concern 23 (friends and social).

## 1. Purpose

Connections between players: friends, blocks, and the visibility those imply.

**Scope discipline matters here.** Social features exist to support the game loop. Collection
War is [not a social network](../../product/NON_GOALS.md), and this domain must not become
one — a feed, messaging and content sharing each bring a moderation obligation an order of
magnitude larger than the feature.

## 2. Responsibilities

- Friend requests, acceptance, removal.
- Blocking, and what a block implies everywhere else.
- Friend lists and friend-visible state.
- Player search, bounded and rate-limited.

## 3. Owned data

| Table         | Holds                                              |
| ------------- | -------------------------------------------------- |
| `friendships` | Two player ids, status, requested at, responded at |
| `blocks`      | Blocker, blocked, created at                       |

Friendship is stored **once** with a canonical ordering of the two ids, not twice. Two rows
per friendship is how the two halves eventually disagree.

## 4. Public interface

```text
requestFriend(playerId, targetId) → Result<void>
respondToRequest(playerId, requestId, accept) → Result<void>
removeFriend(playerId, friendId) → Result<void>
listFriends(playerId, page) → Result<CursorPage<FriendView>>
block(playerId, targetId) → Result<void>
isBlocked(playerId, otherId) → Result<boolean>
```

## 5. Incoming dependencies

`player-profile` · `collection` (viewing a friend's collection) · `arena` ·
`notifications` (request alerts)

## 6. Outgoing dependencies

`player-profile` (display data) · `notifications`

## 7. Domain events

`Social.FriendRequested` · `Social.FriendAccepted` · `Social.FriendRemoved` ·
`Social.PlayerBlocked`

## 8. Security concerns

- **Blocking must be honoured everywhere**, not only here — no requests, no visibility, no
  arena matching, no notifications. A block that only hides a name is not a block, and
  players who need one usually need it to work.
- **Blocks are one-directional and private.** The blocked player is not told.
- **Friend request spam** is harassment. Rate-limited per sender and per target; a declined
  request has a cooldown.
- **Player search is a scraping surface.** Bounded results, rate-limited, and never
  searchable by email address.
- **Friend-visible data is a separate, smaller shape** than self-visible data, decided in one
  place.

## 9. Economy concerns

Friend lists make **collusion easier to organise** — wash trading and arena win-trading are
both easier between people who can find each other.

The domain's job is not to prevent that; it is to make the relationship data available to
moderation so patterns are detectable.

## 10. Expected scaling pressure

Low, unless friend lists become large. `listFriends` joins to profile data, so a batch
profile read matters more than a fast friendship query.

## 11. What this domain must never do

- Never allow interaction between players where a block exists in either direction.
- Never reveal that a player has blocked someone.
- Never expose an email address, or allow search by one.
- Never become a messaging system without an explicit decision and a moderation plan.
- Never grant a gameplay advantage for having friends that cannot also be earned alone.

Related: [Player profile](../player-profile/) · [Administration](../administration/) ·
[Non-goals](../../product/NON_GOALS.md)
