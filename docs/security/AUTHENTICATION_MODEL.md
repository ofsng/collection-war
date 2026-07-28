# Authentication Model

> Audience: whoever implements authentication. Date: 2026-07-28.
> **Status: DESIGNED, NOT IMPLEMENTED.** There is no login anywhere in this system.

---

## The distinction that matters

**Authentication answers _who are you_. Authorization answers _may you do this_.**

They are separate concerns, separate code, and separate documents. Conflating them produces
systems where being logged in is mistaken for being permitted — see
[authorization model](AUTHORIZATION_MODEL.md).

---

## Tokens

| Token       | Lifetime    | Purpose                    | Revocable                         |
| ----------- | ----------- | -------------------------- | --------------------------------- |
| **Access**  | ~15 minutes | Sent with every request    | No — short life is the mitigation |
| **Refresh** | ~30 days    | Obtains a new access token | **Yes**                           |

### Why both

A single long-lived token cannot be revoked without server-side lookup on every request,
which forfeits the reason to use a stateless token at all.

Splitting them means: the frequently-sent token is stateless and cheap to verify, and its
short life bounds the damage of a leak. The rarely-sent token is checked against a database
and can be revoked — so a compromised session can actually be ended.

### Refresh rotation with reuse detection

Every refresh issues a **new** refresh token and invalidates the old one.

If an already-used refresh token is presented, that means one copy was stolen — the
legitimate client and the attacker cannot both hold a valid one. **The entire token family
is revoked**, forcing re-authentication.

This is what turns token theft from silent persistent access into a detectable event.

---

## Storage

| Client      | Access token | Refresh token                               | Why                                                                    |
| ----------- | ------------ | ------------------------------------------- | ---------------------------------------------------------------------- |
| Web / Admin | In memory    | `httpOnly` `Secure` `SameSite` cookie       | `httpOnly` is unreachable from JavaScript, so XSS cannot exfiltrate it |
| Mobile      | In memory    | Keychain / Keystore via `expo-secure-store` | OS-level protection                                                    |

**Never `localStorage` for a refresh token.** It is readable by any script on the page, which
means one XSS becomes permanent account access.

The mobile locale preference already uses SecureStore even though a language is not sensitive
— establishing the pattern before there are three call sites using plain storage.

---

## Passwords

**Argon2id.** Memory-hard, which is what resists GPU cracking; the current OWASP
recommendation.

Parameters (memory cost, time cost, parallelism) are a **security decision with a capacity
consequence** — hashing is intentionally expensive, so it is also a throughput limit. Tune
deliberately, benchmark on the target hardware, and record the values.

Requirements: minimum length over composition rules (length is what actually helps) ·
**checked against a breached-password list** at registration and change · never logged, never
returned, never compared with a non-constant-time comparison.

---

## Registration and reset

### User enumeration is the threat these flows exist to defeat

> `POST /auth/register` and `POST /auth/password-reset` must return the **same response, in
> the same time**, whether or not the address is registered.

Otherwise the endpoint becomes an oracle: an attacker submits a list of addresses and learns
which have accounts. That list is then worth money, and it is the input to T1.

The verification and reset emails differ; the API responses do not.

### Reset tokens

Single-use · short-lived (~1 hour) · invalidated when the password changes · **every session
revoked on a successful reset**, because a reset usually means the account was compromised.

---

## Sessions

Recorded server-side with device metadata and last-used time, so that:

- a player can see and revoke their own sessions;
- a compromised session can be ended;
- an unusual login can be detected and notified.

Revocation is immediate for refresh tokens and bounded by the access-token lifetime for
access tokens — which is why that lifetime is short.

---

## Rate limiting

**Tightest on authentication endpoints**, because credential stuffing is the highest-volume
attack.

| Endpoint               | Limited by                                   |
| ---------------------- | -------------------------------------------- |
| Login                  | IP **and** account, with exponential lockout |
| Registration           | IP                                           |
| Password reset request | IP and address                               |
| Token refresh          | Account                                      |

Per-account limiting is what stops a distributed attack on one account; per-IP limiting is
what stops a broad attack from one source. Both are needed.

---

## What is not planned

**Social login.** Convenient, but it adds a provider dependency, an account-linking problem
and a data-sharing relationship. Not in the MVP; not ruled out.

**Two-factor authentication.** Should exist before real money does. Not in the MVP.

**Biometric unlock on mobile.** A local convenience over a stored refresh token, not a
separate factor. Worth adding; not security-critical.

---

## Current state

Nothing implemented. What exists is the _shape_:

- `packages/configuration` validates `AUTH_JWT_SECRET` (≥ 32 characters), and access and
  refresh token lifetimes, at startup — with production additionally rejecting the example
  placeholder.
- `apps/admin/src/lib/auth.ts` defines the session shape and a guard that **denies
  everything**, with a test asserting it.
- `@collection-war/api-client` already attaches a bearer token per request, resolved by
  callback rather than captured at construction — so a refreshed token takes effect
  immediately.

The guard denying everything is deliberate. A placeholder login that "works" is strictly more
dangerous than no login, because it gets forgotten and ships.

Related: [Authorization model](AUTHORIZATION_MODEL.md) · [Identity domain](../domains/identity/) ·
[Threat model](THREAT_MODEL.md)
