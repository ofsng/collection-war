# Domain: Identity

> **Tier 1 — Critical.** Status: **PROPOSED, not implemented.** Date: 2026-07-28.

## 1. Purpose

Establish and prove **who** is making a request.

## 2. Responsibilities

- Account creation, email verification, password reset.
- Credential storage and verification.
- Session issuance, refresh and revocation.
- Account state: active, suspended, closed.
- Recording authentication attempts for rate limiting and abuse detection.

## 3. Owned data

| Table         | Holds                                                    |
| ------------- | -------------------------------------------------------- |
| `accounts`    | Email, password hash, verification state, account status |
| `sessions`    | Refresh token family, device metadata, revocation state  |
| `auth_events` | Login attempts, resets, lockouts — append-only           |

Passwords are stored as **Argon2id** hashes. Never reversible, never logged, never compared
by a non-constant-time comparison.

## 4. Public interface

```text
register(email, password) → Result<AccountId>
verifyEmail(token) → Result<void>
authenticate(email, password) → Result<{ accessToken, refreshToken }>
refresh(refreshToken) → Result<{ accessToken, refreshToken }>
revokeSession(sessionId) → Result<void>
revokeAllSessions(accountId) → Result<void>
requestPasswordReset(email) → Result<void>
completePasswordReset(token, newPassword) → Result<void>
```

## 5. Incoming dependencies

Every authenticated operation in the system. `player-profile` (an account creates a profile).
`administration` (suspension, support lookup).

## 6. Outgoing dependencies

`notifications` (verification and reset emails, security notices) · `audit` · `economy` — none.

Identity deliberately depends on almost nothing. It must remain verifiable in isolation.

## 7. Domain events

`Identity.AccountRegistered` · `Identity.EmailVerified` · `Identity.PasswordChanged` ·
`Identity.SessionRevoked` · `Identity.AccountSuspended` · `Identity.SuspiciousLoginDetected`

## 8. Security concerns

This is the domain an attacker attacks first, because everything else is downstream of it.

- **Credential stuffing.** The highest-volume attack. Strict rate limiting per IP and per
  account; exponential lockout; breached-password checking at registration.
- **User enumeration.** `requestPasswordReset` and `register` must return the **same**
  response whether or not the address exists, and take the same time.
- **Token theft.** Short-lived access tokens; refresh rotation with reuse detection — a
  replayed refresh token revokes the entire family, because it means one copy was stolen.
- **Timing attacks.** Constant-time comparison for every secret.
- **Reset-token abuse.** Single-use, short-lived, invalidated on password change.
- **Session fixation.** A new session on every authentication.

## 9. Economy concerns

None directly, and everything indirectly: a compromised account is a compromised wallet and
a compromised collection. Identity is the reason the economy rules can be trusted at all.

## 10. Expected scaling pressure

Low volume, high sensitivity. Password hashing is intentionally CPU-expensive — Argon2id
parameters are a **security decision with a capacity consequence**, and must be tuned
deliberately rather than left at a library default.

## 11. What this domain must never do

- Never store a password in a reversible form.
- Never log a password, a token, or a reset link.
- Never reveal whether an email address is registered.
- Never issue a token that cannot be revoked.
- Never trust a client-supplied identity claim without verifying the signature and the
  revocation state.
- Never make an authorization decision — that is [authorization](../../security/AUTHORIZATION_MODEL.md).
  Identity answers _who_, never _may they_.
- Never own gameplay state.

Related: [Authentication model](../../security/AUTHENTICATION_MODEL.md) ·
[Player profile](../player-profile/) · [Threat model](../../security/THREAT_MODEL.md)
