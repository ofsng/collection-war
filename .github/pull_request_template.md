## What and why

<!-- What changes, and what problem it solves. Not a file list — Git already has that. -->

**Task packet:** `CW-NNNN` (or "none — trivial change")

---

## Verification

<!-- REQUIRED. Paste the real output. "Tests pass" is not a verification. -->

```text
$ pnpm verify

```

- [ ] `pnpm verify` passed
- [ ] Integration tests run, or explicitly not applicable
- [ ] Manually checked in a browser or on a device, if UI changed

**What is NOT verified:**

<!-- Be specific. "Mobile changes are typechecked but not run on a device." -->

---

## Checklist

- [ ] Documentation updated **in this change**, not later
- [ ] An ADR added if a real decision was made
- [ ] Status documents updated if the truth changed
- [ ] No new dependency, or it is justified below
- [ ] No secret in the diff — including tests, fixtures and comments

---

## Security

<!-- Delete only if this genuinely touches no boundary. -->

- [ ] Input parsed against a schema
- [ ] Authorization server-side, per operation
- [ ] **Ownership re-verified at the point of change**
- [ ] A non-owned resource returns 404, not 403
- [ ] No internal detail in any client response
- [ ] Nothing secret behind `NEXT_PUBLIC_` / `EXPO_PUBLIC_`

---

## Economy

<!-- REQUIRED if this touches currency, inventory, ownership, rewards or the marketplace.
     Delete only if it truly does not. -->

- [ ] Balance changes go through ledger entries — no direct assignment
- [ ] Integer minor units
- [ ] No currency-kind mixing
- [ ] One transaction, correct isolation level
- [ ] Idempotency key enforced by a unique constraint
- [ ] **A retry returns the original result — tested**
- [ ] **Concurrent access tested**
- [ ] Audit record with the actor
- [ ] Reconciliation would detect this failing
- [ ] Real-money withdrawal still disabled

**Maximum value extractable per hour by a determined attacker:**

---

## Localization and accessibility

<!-- Delete if no UI changed. -->

- [ ] Every string is a translation key, in `tr-TR` **and** `en`
- [ ] Numbers, currency and dates formatted via the localization package
- [ ] Semantic elements; controls labelled; focus visible
- [ ] Status not conveyed by colour alone
- [ ] Loading and error states exist and are announced

---

## New dependencies

<!-- For each: what it does · why the platform is insufficient · who maintains it ·
     transitive footprint · does it run install scripts. Delete if none. -->

---

## Notes for the reviewer

<!-- Anything surprising. A dead end you tried and why it failed. What you are least sure of. -->
