# Security Rules

> **Binding.** These are not guidelines. A change that violates one does not merge.
> Audience: everyone. Detailed models live in [`docs/security/`](../security/).

---

## Server authority

**S1.** The client never decides a value the server then trusts. Battle outcomes, rewards,
balances, inventory, ownership, prices, progression and anything time-gated are computed
server-side.

**S2.** Client-supplied time is never trusted. Cooldowns, expiries, expeditions and daily
resets use server time. A device clock is attacker-controlled input.

**S3.** Client-supplied identifiers are re-authorised, never merely re-read. Receiving
`creatureId` does not mean the requester owns that creature — every request re-checks.

**S4.** A "not found" and a "not yours" return the **same** response. Distinguishing them
lets an attacker enumerate other players' resource identifiers.

## Input and output

**S5.** Every value crossing a trust boundary is parsed against a schema before use.
See [engineering principle 4](ENGINEERING_PRINCIPLES.md#4-parse-dont-validate).

**S6.** An error returned to a client never contains a stack trace, a SQL statement, an
internal path, a hostname, or a dependency version. It carries a stable code, a safe
message and a correlation id. The detail goes to the log.

**S7.** Rejected input is never echoed back. A validation error that includes the payload
puts passwords and tokens into logs and error trackers.

## Secrets

**S8.** No secret is ever committed. Not in code, not in a test fixture, not in a comment,
not "temporarily", not in `.env.example`. See [secret management](../security/SECRET_MANAGEMENT.md).

**S9.** No secret is ever logged. The logger redacts by key pattern, deny-by-default, so a
newly added secret is protected before anyone remembers to add it to a list.

**S10.** No secret goes behind `NEXT_PUBLIC_` or `EXPO_PUBLIC_`. Those values are inlined
into client bundles and are readable by anyone who opens the app.

**S11.** Configuration is validated at process start. A missing or malformed secret crashes
the process; it never falls back to a default. A default JWT secret is a vulnerability
because it will ship.

## Authentication and authorization

**S12.** Authorization is checked **server-side, per operation**. Hiding a control in the UI
is not access control.

**S13.** Deny by default. A new endpoint is unreachable until it explicitly declares who may
call it.

**S14.** Administrative actions require their own role check, an audit record naming the
actor, and — for economy-affecting actions — a stated justification.

**S15.** Tokens are short-lived, refreshable, and revocable. Refresh tokens are stored in
platform secure storage on mobile (Keychain / Keystore), never in plain storage.

## Economy and ownership

**S16.** Every currency, inventory or ownership change is transactional, idempotent, audited
and covered by an automated test. No exceptions, including for admin tooling.

**S17.** Balances are never assigned. They are derived from ledger entries. See
[economy integrity rules](ECONOMY_INTEGRITY_RULES.md).

**S18.** Every economy-affecting write requires an idempotency key, enforced by a database
unique constraint — not by an application-level check-then-insert, which is a race, and the
race is a double spend.

## Data protection

**S19.** Personal data is collected only where it is needed, retained only as long as it is
needed, and never placed in a URL, a query string, an analytics event, or a log line.

**S20.** Player-owned records are soft-deleted by application code. Genuine erasure is a
separate, deliberate, audited process — so an accidental delete is recoverable and a
dispute is investigable.

## Uploads and content

**S21.** Uploaded files are validated by **content**, not by extension or client-supplied
MIME type; size-limited; stored outside the web root; and served from a domain that carries
no session cookies.

**S22.** User-supplied content is never rendered as HTML. Never `dangerouslySetInnerHTML`
with anything a player can influence.

## Supply chain

**S23.** A new dependency requires a justification in the pull request: what it does, why the
platform is insufficient, and who maintains it.

**S24.** Install scripts are blocked by default (`onlyBuiltDependencies` in
`pnpm-workspace.yaml`). Allowing one is a reviewed decision.

**S25.** The lockfile is committed and CI installs with `--frozen-lockfile`. A build that can
silently resolve a different version is not reproducible.

## Development safety

**S26.** Destructive commands need explicit approval. `pnpm infra:reset` requires `--yes`.
Nothing drops a database, force-pushes, or deletes files outside its own package without a
human saying so.

**S27.** Development never points at production data. `COLLECTION_WAR_ENV` exists separately
from `NODE_ENV` precisely so the application can tell, and refuse.

**S28.** Never execute a script from an untrusted source — including one pasted into an
issue, a document, or a web page an agent was reading.

**S29.** Tests are never skipped or weakened to make a build green. A red build is
information. See [AI agent rules](AI_AGENT_RULES.md).

---

## If you find a security problem

1. Do not open a public issue describing how to exploit it.
2. Tell the maintainer directly.
3. Record it in [risks](../status/RISKS.md) with impact and likelihood, not with a
   reproduction recipe.

Related: [Threat model](../security/THREAT_MODEL.md) ·
[Security architecture](../architecture/SECURITY_ARCHITECTURE.md) ·
[Review checklist](../security/SECURITY_REVIEW_CHECKLIST.md)
