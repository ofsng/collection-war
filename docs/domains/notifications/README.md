# Domain: Notifications

> **Tier 3 — Supporting.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.

## 1. Purpose

Tell a player that something happened, across whichever channels they have consented to.

## 2. Responsibilities

- Notification definitions and templates.
- Per-player delivery preferences and consent.
- Reacting to domain events by creating notifications.
- Delivery through channel adapters: in-app, push, email.
- Read state and history.

## 3. Owned data

| Table                      | Holds                                           |
| -------------------------- | ----------------------------------------------- |
| `notifications`            | `player_id`, type, payload, created at, read at |
| `notification_preferences` | Per-player, per-type, per-channel opt-in        |
| `device_tokens`            | Push tokens, platform, last seen                |
| `delivery_attempts`        | Channel, status, error — for diagnosis          |

## 4. Public interface

```text
notify(playerId, type, payload, tx) → Result<NotificationId>
listNotifications(playerId, page) → Result<CursorPage<Notification>>
markRead(playerId, notificationIds) → Result<void>
updatePreferences(playerId, prefs) → Result<void>
registerDevice(playerId, token, platform) → Result<void>
```

## 5. Incoming dependencies

`marketplace` (sold, expired) · `quests` (completed) · `exploration` (expedition ready) ·
`arena` (attacked) · `identity` (security notices) · `social`

## 6. Outgoing dependencies

`player-profile` (locale preference) · `localization` (content) · external push and email
providers

## 7. Domain events

`Notifications.NotificationCreated` · `Notifications.NotificationDelivered` ·
`Notifications.DeliveryFailed`

## 8. Security concerns

- **Notification content must not leak.** A push notification appears on a **lock screen**,
  where anyone holding the phone can read it. It must never contain a balance, a token, a
  verification code, or another player's personal data.
- **Device tokens are per-player** and must be invalidated on sign-out, or a subsequent user
  of the device receives someone else's notifications.
- **Consent is respected**, and security notices are the only category that may bypass a
  marketing opt-out — because a "someone signed in from a new device" message protects the
  player.
- **Rate limiting** — a bug that emits a notification per event in a loop is both a cost and
  a way to make a player uninstall.

## 9. Economy concerns

None directly. Indirectly, notifications drive marketplace activity ("your listing sold"), so
a delivery failure is a liquidity problem rather than a data problem.

## 10. Expected scaling pressure

Fan-out. A single event can produce notifications for many players, and delivery involves
external providers with their own rate limits and latency.

Response: all delivery happens in **workers**, never inline in a request; batch where the
provider supports it; retry with backoff; and treat the notification row as the source of
truth so a failed push is still visible in-app.

## 11. What this domain must never do

- Never include a secret, a token, a balance or a verification code in a push payload.
- Never deliver to a channel the player has not consented to (security notices excepted).
- Never block a business transaction on delivery — notifications are created inside the
  transaction and delivered afterwards, through the outbox.
- Never retain a device token after sign-out.
- Never treat a delivery failure as a business failure.

Related: [Event architecture](../../architecture/EVENT_ARCHITECTURE.md) ·
[Localization](../../architecture/LOCALIZATION_ARCHITECTURE.md)
