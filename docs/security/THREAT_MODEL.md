# Threat Model: Platform

> Audience: everyone. Date: 2026-07-28.
> **Scope: the platform.** Per-domain threat models are written during
> [CW-0002](../tasks/BACKLOG.md) using the
> [template](../specifications/templates/THREAT_MODEL_TEMPLATE.md).

---

## What is being protected, in order of value to an attacker

| Asset                      | Why they want it                        | Impact                                              |
| -------------------------- | --------------------------------------- | --------------------------------------------------- |
| **Player accounts**        | Access to everything the player owns    | Total compromise for that player                    |
| **Currency and ownership** | Direct, tradeable value                 | Economy damage that spreads through the marketplace |
| **Administrative access**  | Mint currency, alter ownership, at will | Catastrophic                                        |
| **Personal data**          | Resale, credential stuffing elsewhere   | Legal and reputational                              |
| **Game content**           | Datamining, competitive advantage       | Minor                                               |
| **Availability**           | Extortion, or spite                     | Revenue and trust                                   |

---

## Actors

| Actor                         | Trust      | Capabilities                                                                               |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| Anonymous                     | None       | Public endpoints, registration, unlimited request attempts                                 |
| Authenticated player          | **Low**    | Their own data, all game actions. **Can decompile the app, intercept and replay traffic.** |
| Another player                | Low        | The same, aimed at a different account                                                     |
| Administrator                 | Privileged | Support and moderation actions                                                             |
| **Compromised administrator** | —          | **Assume this happens.** Blast radius: currency and ownership                              |
| Insider                       | —          | Repository and infrastructure access                                                       |

**Our own applications are untrusted.** A mobile binary can be unpacked and its requests
replayed. "It came from our app" is not a security property.

---

## Threats

### T1 — Credential stuffing · Spoofing · **High likelihood**

The highest-volume attack against any consumer application.

**Mitigation:** strict rate limiting per IP and per account · exponential lockout ·
breached-password checking at registration · Argon2id hashing · alerting on failed-login
spikes.
**Status:** designed, **not implemented** — authentication does not exist yet.

### T2 — Client-side value forgery · Tampering · **High likelihood**

Modifying a request to claim a battle win, a reward, a balance or an ownership change.

**Mitigation:** [server authority](../adr/ADR-0024-server-authoritative-state.md). The server
computes every outcome; the client renders. No client-supplied value is trusted, ever.
**Status:** **architecturally enforced.** Client applications cannot even import storage or
domain-mutation code — lint-enforced and verified.

### T3 — Economy duplication · Tampering · **Medium likelihood, catastrophic impact**

Duplicating currency or items via replay, race condition or a logic flaw.

**Mitigation:** ledger-first economy · idempotency enforced by a **database unique index**,
not an application check · `SERIALIZABLE` isolation for value-moving operations · six
executable invariants · scheduled reconciliation.
**Status:** primitives **implemented and tested** (30 tests). The domain is not built.

### T4 — Time manipulation · Tampering · **High likelihood, easy to attempt**

Changing the device clock to complete expeditions, skip cooldowns or claim extra daily
rewards.

**Mitigation:** all time is server time. A client never supplies a timestamp that matters.
**Status:** **architecturally enforced.** Domain code cannot call `Date.now()` — lint-enforced
and verified.

### T5 — Resource enumeration · Information disclosure · **Medium likelihood**

Iterating identifiers to discover other players' creatures, listings or accounts.

**Mitigation:** UUIDv7 identifiers are unguessable · a non-owned resource returns **404, not
403** · rate limiting on lookups.
**Status:** identifier strategy implemented; authorization not yet.

### T6 — Internal detail leakage · Information disclosure · **Medium likelihood**

Stack traces, SQL, hostnames or dependency versions in error responses.

**Mitigation:** `AllExceptionsFilter` returns a stable code and correlation id; detail goes
to the log. `/api/v1/system/info` deliberately exposes no version or hostname. OpenAPI is not
served in production.
**Status:** **implemented and tested**, including a test that the filter never returns a stack
trace or SQL.

### T7 — Secret leakage · Information disclosure · **Medium likelihood**

Secrets in code, logs, error trackers or client bundles.

**Mitigation:** deny-by-default log redaction by key pattern · `.env` git-ignored ·
configuration validated at startup with production rejecting the example placeholder · no
secret behind `NEXT_PUBLIC_`/`EXPO_PUBLIC_` · validation errors never echo the payload.
**Status:** **implemented and tested** (11 redaction tests).

### T8 — Administrative compromise · Elevation of privilege · **Low likelihood, catastrophic**

**Mitigation:** separate application and authentication · role-based least privilege ·
**every action audited with the actor named** · justification required for economy actions ·
re-authentication for high-risk actions · admin currency changes go through the ledger like
any other, with no privileged bypass.
**Status:** the guard exists and **denies everything**, with a test asserting it. No
authentication exists to grant anything.

### T9 — Denial of service · **Medium likelihood**

Request flooding, expensive queries, unbounded payloads.

**Mitigation:** rate limiting · cursor pagination with a clamped limit · 1 MiB body cap ·
bounded health checks · query timeouts.
**Status:** body cap and pagination implemented. **Rate limiting is not.**

### T10 — Supply chain compromise · **Low likelihood, high impact**

A malicious or compromised dependency.

**Mitigation:** exact pinned versions · committed lockfile · `--frozen-lockfile` in CI ·
install scripts blocked by default · dependency justification required in review.
**Status:** **implemented.** Two packages are currently blocked and working without their
scripts.

### T11 — Collusion and market manipulation · **Medium likelihood**

Wash trading to launder value; arena win-trading.

**Mitigation:** complete marketplace and match history retained; reconcilable and analysable.
**Status:** the data model supports detection. No detection exists.

### T12 — Automation and botting · **Medium likelihood**

Scripted farming of passive rewards, across many accounts.

**Mitigation:** rate limiting · capped passive accrual · anomaly detection.
**Status:** **not implemented.** Passive-faucet caps are documented as a design requirement in
the [exploration](../domains/exploration/) and [habitats](../domains/habitats/) domains.

---

## Accepted risks

An unlisted accepted risk is an unnoticed vulnerability.

| Risk                                   | Why accepted                                                                               | Revisit                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------- |
| No penetration test                    | Nothing deployed, no authentication to test                                                | Before production                 |
| No CSP on the web app                  | A CSP written before the app has real assets is either useless or breaks the first feature | Before production                 |
| No rate limiting                       | No authentication to protect, and no traffic                                               | With CW-0003                      |
| Local credentials in `.env.example`    | Every service they reach is a local, non-networked container                               | Never — they must never be reused |
| Analytics PII guard is structural only | It cannot prove absence, but it catches the obvious additions in review                    | When gameplay events are designed |

---

## The honest summary

**Most mitigations above are architectural rather than implemented**, because there is very
little to attack yet: no authentication, no gameplay, no deployment, no players.

What _is_ genuinely in place — and verified — is the structure that makes the implemented
mitigations hard to undo: server authority, dependency boundaries, determinism enforcement,
log redaction, error shaping, and the economy invariants.

Per-domain threat models are part of [CW-0002](../tasks/BACKLOG.md), before implementation.

Related: [Security rules](../constitution/SECURITY_RULES.md) ·
[Security architecture](../architecture/SECURITY_ARCHITECTURE.md) ·
[Review checklist](SECURITY_REVIEW_CHECKLIST.md)
