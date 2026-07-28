# Secret Management

> Audience: everyone. Date: 2026-07-28.

---

## The rules

1. **No secret is ever committed.** Not in code, not in a test fixture, not in a comment, not
   "temporarily", not in `.env.example`.
2. **No secret is ever logged.** Redaction is deny-by-default at the logger.
3. **No secret goes behind `NEXT_PUBLIC_` or `EXPO_PUBLIC_`.** Those values are inlined into
   client bundles.
4. **Configuration is validated at startup.** A missing or malformed secret crashes the
   process; it never falls back to a default.
5. **Each environment has its own secrets.** No sharing across environments, ever.
6. **Rotation must be possible** without a code change.

---

## Why "temporarily" is not a thing

A secret committed and then removed in a later commit **is still in the repository**. It is in
the history, in every clone, in every fork, and in every CI cache.

The only correct response to a committed secret is to **rotate it**, immediately. Removing
the file is cleanup, not remediation.

---

## What counts as a secret

| Secret                             | Where it lives                         |
| ---------------------------------- | -------------------------------------- |
| `AUTH_JWT_SECRET`                  | Environment                            |
| Database credentials               | Environment (in the connection string) |
| Redis credentials                  | Environment                            |
| Object storage keys                | Environment                            |
| SMTP credentials                   | Environment                            |
| Payment provider keys              | Environment — none exist yet           |
| Push credentials (APNs, FCM)       | Secret file, never committed           |
| Signing certificates and keystores | Never in the repository                |
| Session and refresh tokens         | Never persisted outside secure storage |

**Not secrets:** the API's public URL, the default locale, feature-flag _names_, port
numbers.

---

## Local development

`.env`, git-ignored. Created from `.env.example`, which contains placeholders only.

The values in `.env.example` are safe **only** because every service they point at is a
local, non-networked container bound to `127.0.0.1`. They are useless anywhere else.

```bash
# Generate a real secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`pnpm check:env` validates that `.env` covers every key `.env.example` declares. **It never
prints a value** — printing "your AUTH_JWT_SECRET is …" into a terminal that may be recorded
or screen-shared is exactly the leak this prevents.

---

## Hosted environments

**Not a `.env` file on a server.** A managed secret store, injected at runtime.

Requirements: audited access · rotation without redeployment · least privilege per service ·
**separate storage from backups** — a key stored alongside the data it encrypts protects
nothing.

Not configured; no hosted environment exists.

---

## Validation at startup

`packages/configuration` validates every variable before the process constructs anything else.

Production is additionally strict, and each rule is unit-tested:

| Rule                                    | Why                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `AUTH_JWT_SECRET` ≥ 32 characters       | A short signing key makes forgery tractable, and a forged token is account takeover |
| The example placeholder is **rejected** | This is the check that stops `.env.example` reaching a real environment             |
| Wildcard CORS is **rejected**           |                                                                                     |
| `DATABASE_SSL` must be true             |                                                                                     |

**Fail fast, and totally.** A process that cannot be sure which database it is talking to
must not be allowed to write to one. There is no partial start and no degraded mode.

---

## Redaction

Deny-by-default, **by key pattern**, at the logger itself.

Every incident review of a leaked credential ends the same way: nobody meant to log it. A
request body was logged wholesale, or an error object carried a config value, or a debug line
survived a merge.

Matching by pattern rather than by an allow-list means **a new secret is protected before
anyone remembers to add it**. The opposite default leaks on every addition someone forgets.

Covered: `password` · `token` · `secret` · `authorization` · `api[-_]?key` · `credential` ·
`cookie` · `session[-_]?id` · `card[-_]?number` · `cvv` · `iban` · `ssn` — and their spelling
variants, at any depth.

Connection strings are masked to keep the host readable and the password hidden.

Additionally: **validation errors never echo the rejected input**, which is how passwords
otherwise reach error trackers.

---

## Client bundles

`NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` are **inlined at build time** and readable by anyone who
opens developer tools or unpacks the app.

A mobile app **cannot hold a secret at all**. Any value it needs to authenticate with must be
obtained from the server at runtime, tied to a user session.

Both client applications read these in exactly one file each (`lib/config.ts`), so the full
set that ships to a browser is auditable at a glance.

---

## If a secret leaks

1. **Rotate immediately.** Before investigating, before writing anything up.
2. Revoke sessions or credentials derived from it.
3. Check logs for use of the leaked value.
4. Remove it from the code — this is cleanup, not remediation.
5. Write it up. See [incident response](../runbooks/INCIDENT_RESPONSE.md).
6. Add the check that would have caught it.

**Do not** try to rewrite Git history as the primary response. It does not remove the secret
from clones, forks or caches, and it delays the rotation that actually helps.

Related: [Security rules](../constitution/SECURITY_RULES.md) ·
[Supply chain security](SUPPLY_CHAIN_SECURITY.md)
