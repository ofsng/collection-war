# Domain: Administration

> **Tier 2 — Core**, but with **Tier 1 security requirements**.
> Status: **PROPOSED, not implemented.** Date: 2026-07-28.
> Covers domain concerns 24 (administration), 25 (moderation), 28 (feature flags) and
> 30 (content management).

## 1. Purpose

Operate the game: support players, moderate content, control features, and publish content.

These four are one domain because they share the same actors, the same privilege model and
the same audit requirement. Splitting them would duplicate the authorization and audit
machinery four times, and one of the copies would eventually be weaker than the others.

## 2. Responsibilities

- Administrator accounts, roles and permissions.
- Support tooling: player lookup, state inspection, corrective action.
- Moderation: reports, review, sanctions.
- Feature flags.
- Content management: authoring and publishing versioned content.

## 3. Owned data

| Table                | Holds                                                          |
| -------------------- | -------------------------------------------------------------- |
| `administrators`     | Account link, roles, status                                    |
| `admin_actions`      | **Immutable**: actor, action, target, justification, timestamp |
| `moderation_reports` | Reporter, target, reason, status, resolution                   |
| `sanctions`          | Player, type, reason, expiry, issuing admin                    |
| `feature_flags`      | Key, value, environment, changed by, changed at                |
| `content_versions`   | Version, status, published by, published at                    |

## 4. Public interface

```text
lookupPlayer(adminId, query) → Result<AdminPlayerView>
adjustCurrency(adminId, playerId, amount, justification, idempotencyKey) → Result<void>
issueSanction(adminId, playerId, sanction, justification) → Result<void>
resolveReport(adminId, reportId, resolution) → Result<void>
setFeatureFlag(adminId, key, value, justification) → Result<void>
publishContentVersion(adminId, version) → Result<void>
```

**Every method takes an `adminId`, and every mutating method takes a `justification`.** Those
parameters are the audit trail. Making them required in the signature is what stops an
un-attributed administrative action from being possible to write.

## 5. Incoming dependencies

The admin application only. No gameplay domain depends on administration — that direction
would let a game feature invoke an administrative capability.

## 6. Outgoing dependencies

Almost everything, through public interfaces: `identity`, `player-profile`, `economy`,
`owned-creatures`, `inventory`, `marketplace`, `audit`.

## 7. Domain events

`Administration.ActionPerformed` · `Administration.SanctionIssued` ·
`Administration.FeatureFlagChanged` · `Administration.ContentVersionPublished`

## 8. Security concerns

**The highest-privilege surface in the system.** A compromised administrator can mint
currency and alter ownership.

- **Separate application, separate authentication**, hardened headers, `frame-ancestors
'none'` so it cannot be embedded in a clickjacking page.
- **Least privilege by role**: `SUPPORT`, `MODERATOR`, `ECONOMY`, `SUPER_ADMIN`. Currency
  adjustment requires `ECONOMY`, not merely "admin".
- **Every action audited** with the actor named. When an admin acts on a player's behalf,
  `Actor.onBehalfOf` records it — so an admin action is never attributed to the player.
- **Re-authentication for high-risk actions.**
- **Justification required** for anything economy-affecting, and stored.
- **Admin actions obey the same economy rules as player actions**: transactional,
  idempotent, ledger-recorded. An admin currency grant is a ledger entry from a system
  faucet, not a balance edit. There is no privileged path around the invariants.

## 9. Economy concerns

Administrative currency adjustment is a **faucet with no gameplay cost**, which makes it the
easiest way to accidentally — or deliberately — break the economy.

Controls: role-gated, justified, ledgered, reported. Adjustments appear in reconciliation
like any other movement, so an unexplained one is visible.

## 10. Expected scaling pressure

Low volume. The concern is not throughput but **query breadth**: a support agent needs a
cross-domain view of one player, which means many small reads across many domains rather
than one large query. A purpose-built read model is the right answer if it becomes slow —
not a set of cross-domain joins.

## 11. What this domain must never do

- Never perform an action without an audit record naming the actor.
- Never adjust currency without a justification and a ledger entry.
- Never bypass the economy invariants, transactions or idempotency requirements.
- Never write another domain's tables directly.
- Never allow an administrator to act as a player without recording `onBehalfOf`.
- Never expose a player's password hash, tokens or full personal data — support needs enough
  to help, not everything.
- Never allow a feature-flag change to enable
  [real-money withdrawal](../../constitution/ECONOMY_INTEGRITY_RULES.md#e9-real-money-withdrawal-stays-disabled)
  without the full approval process.

## Bootstrap status

The admin application exists with a **route guard that denies everything**.
`getAdminSession()` returns `null`, `requireAdmin` denies every role, and there is a test
asserting exactly that.

A placeholder admin session is the single most dangerous shortcut available in this codebase
— it works, gets forgotten, and ships. The test exists to make adding one fail the build.

Related: [Audit](../audit/) · [Authorization model](../../security/AUTHORIZATION_MODEL.md) ·
[Economy](../economy/)
