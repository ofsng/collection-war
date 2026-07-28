# ADR-0026: scrypt for password hashing

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** CW-0100

## Context

The first vertical slice implements authentication, which requires a password hash.

[AUTHENTICATION_MODEL.md](../security/AUTHENTICATION_MODEL.md) specifies **Argon2id**, the
current OWASP first choice. Implementing it means a dependency:

- `argon2` — a native module requiring a compile step at install. Install scripts are
  **blocked by default** in this repository
  ([supply chain](../security/SUPPLY_CHAIN_SECURITY.md)), so allowing it is a reviewed
  supply-chain decision.
- `@node-rs/argon2` — prebuilt binaries per platform; no compile, but a native binary per
  architecture and a heavier install.

## Decision

**Use `scrypt` from `node:crypto`** for the first release, with parameters
`N = 2^16, r = 8, p = 1`, a 16-byte per-user random salt, a 64-byte derived key, and
`timingSafeEqual` for comparison.

The stored format is self-describing and carries its parameters:

```text
scrypt$16384$8$1$<base64 salt>$<base64 hash>
```

That format is the migration mechanism: a future Argon2id hash can be stored alongside
scrypt hashes and distinguished by its prefix, so users are rehashed on next login rather
than being forced to reset.

## Alternatives considered

**Argon2id via `argon2`.** The OWASP first choice, and memory-hard by design. Rejected for
now: it requires enabling an install script, which is the exact supply-chain control this
repository set up deliberately. Enabling it for a slice that has no users yet trades a real
control for a marginal gain.

**Argon2id via `@node-rs/argon2`.** No compile step. Rejected narrowly — it still ships
native binaries, and the benefit over correctly-parameterised scrypt is small at this stage.
This is the most likely upgrade path.

**bcrypt.** Rejected: capped at 72 bytes of input, not memory-hard, and weaker against GPU
attack than either alternative.

**PBKDF2.** Also built in. Rejected: not memory-hard, so it is the weakest of the credible
options against dedicated hardware.

## Positive consequences

- **Zero new dependencies.** No native module, no install script, no supply-chain review.
- Memory-hard, and explicitly acceptable under OWASP guidance when Argon2id is unavailable.
- Identical behaviour on every platform and in CI — no prebuilt-binary matrix.
- Parameters are stored with each hash, so they can be raised over time without a flag day.
- The prefix makes migration to Argon2id a rehash-on-login, not a password reset.

## Negative consequences

- **It is not the first choice.** Argon2id resists side-channel and GPU attack better, and
  security documentation now has a deviation to explain.
- scrypt's cost parameters are less intuitive to tune than Argon2's.
- `N = 2^16` costs roughly 64 MB per hash — a deliberate capacity decision, and a throughput
  limit on the login endpoint that must be considered alongside rate limiting.

## Risks

- **Under-parameterisation.** A too-low `N` makes the whole exercise decorative. Mitigated by
  storing parameters per hash and by a unit test asserting the minimum.
- **The deviation is forgotten** and never upgraded. Mitigated by the review condition below
  and by an entry in [DEFERRED_WORK.md](../status/DEFERRED_WORK.md).
- Memory cost under a login flood is a denial-of-service vector. Mitigated by rate limiting —
  **which does not exist yet** and is required before launch.

## Review conditions

- **Before the first real users**: re-evaluate `@node-rs/argon2`. If adopted, existing hashes
  migrate on next login via the prefix.
- If the login endpoint's memory cost becomes a capacity problem, re-tune `N` deliberately
  and record the new value — do not lower it silently.
- `AUTHENTICATION_MODEL.md` has been updated to state scrypt with this ADR as the reason,
  rather than being left contradicting the code.
