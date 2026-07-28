# Domain: Arena

> **Tier 3 — Supporting.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.

## 1. Purpose

Asynchronous player-versus-player: battling a **snapshot** of another player's defence team,
not the player themselves.

## 2. Responsibilities

- Maintaining each player's defence team snapshot.
- Opponent selection.
- Running an attack and recording the result.
- Standings, seasons and their rewards.
- Attack limits and cooldowns.

## 3. Owned data

| Table             | Holds                                                               |
| ----------------- | ------------------------------------------------------------------- |
| `arena_defences`  | `player_id`, snapshotted team composition **and stats**, updated at |
| `arena_matches`   | Attacker, defender, battle id, outcome, rating change               |
| `arena_standings` | `player_id`, rating, season, wins, losses                           |

The defence entry stores a **snapshot of stats, not a reference to live creatures**. This is
the central design decision of the domain: otherwise selling a creature would silently
change, or break, an opponent other players are already fighting.

## 4. Public interface

```text
setDefence(playerId, teamId) → Result<void>
findOpponents(playerId) → Result<OpponentView[]>
attack(playerId, opponentId, teamId, idempotencyKey) → Result<ArenaResult>
getStandings(season, page) → Result<CursorPage<Standing>>
```

## 5. Incoming dependencies

`quests` (arena objectives) · `player-profile` (rank display)

## 6. Outgoing dependencies

`battle` (resolution) · `owned-creatures` (attacker team ownership) ·
`player-profile` (opponent display names) · `economy` (rewards)

## 7. Domain events

`Arena.AttackResolved` · `Arena.RatingChanged` · `Arena.SeasonEnded`

## 8. Security concerns

- **Opponent selection is server-side.** A client choosing its own opponent would farm the
  weakest player repeatedly.
- **Defence snapshots are immutable during a match**, so a defender cannot change their team
  mid-attack.
- **Attack limits are enforced server-side**, with server time. A client-supplied cooldown is
  no cooldown.
- **Collusion.** Two accounts trading wins is the classic arena exploit. Detection is a
  moderation concern; the domain's job is to record enough data (attacker, defender, time,
  rating change) to make it detectable.
- **Opponent data leakage.** `OpponentView` must expose only what is needed to make a choice
  — never the opponent's inventory, currency or account details.

## 9. Economy concerns

Arena rewards are a faucet, and season rewards are a large one. Rating-based rewards create a
strong incentive to manipulate rating, which is why match records are retained and
reconcilable.

## 10. Expected scaling pressure

Opponent selection is the hard part: finding a rating-appropriate opponent among many players
without scanning the table. Response: an index on `(season, rating)` and selection from a
bounded rating window.

Standings are read-heavy and tolerate staleness well — a leaderboard that is thirty seconds
old is fine.

## 11. What this domain must never do

- Never let a client choose its opponent.
- Never battle a live creature — only a snapshot.
- Never apply a rating change outside the transaction that records the match.
- Never expose a defender's account, inventory or currency.
- Never trust client-supplied timing for cooldowns or attack counts.
- Never resolve a battle itself.

Related: [Battle](../battle/) · [Player profile](../player-profile/) ·
[Administration](../administration/)
