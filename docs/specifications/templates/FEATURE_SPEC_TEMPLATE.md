# Feature Specification: <Name>

- **Status:** Draft | In review | Approved | Implemented | Superseded
- **Date:** YYYY-MM-DD
- **Author:**
- **Reviewers:**
- **Related:** domain(s), ADR(s), task packet(s)

---

## 1. Problem

What problem does this solve, for whom, and how do we know it is real?

> Write the problem, not the solution. A specification that starts with the solution has
> already skipped the part where somebody could have suggested a better one.

## 2. Goals

What this must achieve. Specific and checkable.

## 3. Non-goals

What this deliberately does **not** do. Be generous here — this is the section that prevents
scope creep during implementation, and it is the section reviewers use most.

## 4. Player-visible behaviour

What the player sees and does. Include the unhappy paths:

- What happens when it succeeds?
- What happens when the player cannot afford it / does not own it / is rate-limited?
- What happens when the server is unreachable mid-action?
- What happens on a retry after a timeout?

## 5. Domains involved

| Domain | Role | New or existing |
| ------ | ---- | --------------- |
|        |      |                 |

**Which domain owns the data?** If the answer is "several", the design is probably wrong —
see [module boundaries](../../architecture/MODULE_BOUNDARIES.md).

## 6. Server behaviour

The authoritative logic. Every decision the server makes, and on what basis.

- [ ] No decision is delegated to the client.
- [ ] No client-supplied time is trusted.
- [ ] Every client-supplied identifier is re-authorised.

## 7. Data changes

New or changed tables, columns, indexes, constraints. Use the
[data model template](DATA_MODEL_TEMPLATE.md) for anything non-trivial.

## 8. API surface

New or changed endpoints. Use the [API spec template](API_SPEC_TEMPLATE.md).

## 9. Events

Domain events published or consumed. Are consumers idempotent?

## 10. Economy impact

**Required if this touches currency, inventory, ownership or rewards. Delete only if it truly
does not.**

- Is this a faucet, a sink, or neither?
- What is the maximum value a player can extract per unit time?
- What stops a retry from doubling the effect?
- Which ledger accounts move?
- Isolation level, and why?
- Which [economy integrity rules](../../constitution/ECONOMY_INTEGRITY_RULES.md) apply?

## 11. Security

Threats and mitigations. Use the [threat model template](THREAT_MODEL_TEMPLATE.md) for
anything Tier 1 or Tier 2.

- Who is authorised, and checked where?
- What would an attacker try first?
- What is rate-limited?

## 12. Localization

- [ ] Every user-facing string is a translation key.
- [ ] Both `tr-TR` and `en` provided.
- [ ] Numbers, currency, dates and durations formatted via the localization package.

## 13. Accessibility

- [ ] Semantic elements; labelled controls.
- [ ] Keyboard reachable (web); 44pt touch targets (mobile).
- [ ] Status is not conveyed by colour alone.
- [ ] Loading and error states are announced.

## 14. Performance

Expected volume, hot paths, and the indexes that support them. What breaks first at ten times
the expected load?

## 15. Testing

| Level              | What is covered |
| ------------------ | --------------- |
| Unit               |                 |
| Integration        |                 |
| E2E                |                 |
| Economy invariants |                 |

## 16. Rollout

Feature flag? Migration? Can it be rolled back? What is the plan if it goes wrong?

## 17. Open questions

Things genuinely undecided. **List them.** An unlisted open question becomes an arbitrary
decision made by whoever hits it first, at the least convenient moment.
