# Threat Model: <Feature / Domain>

- **Status:** Draft | In review | Approved
- **Date:** YYYY-MM-DD
- **Author / Reviewers:**
- **Integrity tier:** 1 | 2 | 3

> Required for anything Tier 1, anything touching currency, inventory or ownership, and any
> new authentication or authorization surface.

---

## 1. What is being protected

What an attacker would want here, in order of value to them:

| Asset | Why it is valuable to an attacker | Impact if compromised |
| ----- | --------------------------------- | --------------------- |

## 2. Trust boundaries

Where untrusted input meets trusted processing. A Mermaid diagram is usually clearest.

Remember: **our own clients are untrusted.** A mobile binary can be unpacked and its requests
replayed.

## 3. Actors

| Actor                | Trust                     | Capabilities                                       |
| -------------------- | ------------------------- | -------------------------------------------------- |
| Anonymous            | None                      |                                                    |
| Authenticated player | Low                       |                                                    |
| Another player       | Low                       |                                                    |
| Administrator        | Authenticated, privileged |                                                    |
| Compromised admin    | —                         | **Assume this happens.** What is the blast radius? |
| Insider              | —                         | What would be detectable?                          |

## 4. Threats (STRIDE)

For each: what it is, how likely, how bad, and **what specifically stops it**.

| #   | Threat | Category               | Likelihood | Impact | Mitigation | Status                      |
| --- | ------ | ---------------------- | ---------- | ------ | ---------- | --------------------------- |
| T1  |        | Spoofing               |            |        |            | Mitigated / Accepted / Open |
| T2  |        | Tampering              |            |        |            |                             |
| T3  |        | Repudiation            |            |        |            |                             |
| T4  |        | Information disclosure |            |        |            |                             |
| T5  |        | Denial of service      |            |        |            |                             |
| T6  |        | Elevation of privilege |            |        |            |                             |

> "We validate input" is not a mitigation. **"The `(key, scope)` unique index rejects the
> second insert, so a retried purchase returns the original order"** is a mitigation.

## 5. Game-specific threats

The categories STRIDE does not name, and which matter most here:

| Threat                                       | Applies? | Mitigation |
| -------------------------------------------- | -------- | ---------- |
| Duplication (items, currency, creatures)     |          |            |
| Time manipulation (device clock)             |          |            |
| Replay of a successful request               |          |            |
| Race conditions on a shared balance or asset |          |            |
| Automation / botting                         |          |            |
| Multi-accounting for passive rewards         |          |            |
| Collusion (wash trading, win trading)        |          |            |
| Enumeration of other players' resources      |          |            |
| Scraping                                     |          |            |

## 6. Economy-specific analysis

**Required if this touches value.**

- What is the maximum value extractable per unit time by a determined attacker?
- What happens if every request is retried ten times?
- What happens if two requests arrive simultaneously?
- Can a randomly determined reward reach a withdrawable balance? (It must not —
  [E8](../../constitution/ECONOMY_INTEGRITY_RULES.md#e8-random-rewards-never-become-withdrawable-value))
- Would reconciliation detect an exploit? How quickly?

## 7. Accepted risks

Risks knowingly accepted, with the reason and who accepted them. **An unlisted accepted risk
is an unnoticed vulnerability.**

| Risk | Why accepted | Accepted by | Revisit when |
| ---- | ------------ | ----------- | ------------ |

## 8. Detection

How would we know this was being exploited?

- [ ] Logged with enough context to investigate
- [ ] An anomaly would be visible in reconciliation
- [ ] An alert exists, or is specified
- [ ] The audit trail would identify the actor

Detection matters as much as prevention. Assume at least one mitigation will fail.

## 9. Verification

- [ ] Tests exist for each mitigation
- [ ] Authorization tested: unauthenticated, wrong role, not the owner
- [ ] Idempotency tested under retry
- [ ] Concurrency tested
- [ ] Rate limiting tested

## 10. Open questions
