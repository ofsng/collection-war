# Runbook: Incident Response

> Audience: whoever is looking at something broken. Date: 2026-07-28.
> **No production system exists yet.** This is the process, written calmly in advance —
> which is the only time it can be written well.

---

## Severity

| Level     | Means                                                               | Response        |
| --------- | ------------------------------------------------------------------- | --------------- |
| **SEV-1** | Value is being created or destroyed. Data loss. Account compromise. | Drop everything |
| **SEV-2** | Players cannot play, or a core feature is broken                    | Urgent          |
| **SEV-3** | A feature is degraded; a workaround exists                          | Same day        |
| **SEV-4** | Cosmetic, or affects few players                                    | Normal queue    |

### An economy incident is always SEV-1

A reconciliation failure, a duplication exploit, or an unexplained balance change is SEV-1
regardless of how many players it appears to affect.

Because economy damage **compounds**: duplicated value spreads through the marketplace within
hours, and every subsequent trade is built on it. An hour's delay can be the difference
between a fix and a rollback.

---

## The sequence

```mermaid
flowchart LR
    d["1. Detect"] --> a["2. Assess"] --> s["3. Stop the bleeding"] --> f["4. Fix"] --> v["5. Verify"] --> w["6. Write it up"]
    classDef n fill:#2b323c,stroke:#6e7781,color:#e8ecf1
    classDef stop fill:#4a3520,stroke:#d29922,color:#e8ecf1
    class d,a,f,v,w n
    class s stop
```

### 1. Detect

Alert, player report, or noticing. Note the **time you became aware** — it is the first thing
you will need and the easiest to forget.

### 2. Assess

- What is broken, for whom, and how many?
- Is value being created or destroyed **right now**?
- Is it getting worse?
- What changed recently? (deploy, migration, content version, dependency)

### 3. Stop the bleeding

**Containment before diagnosis.** Understanding _why_ can wait; stopping the damage cannot.

| Situation                 | Containment                                                     |
| ------------------------- | --------------------------------------------------------------- |
| An exploit is being used  | Disable the feature by flag                                     |
| A bad deploy              | Roll back to the previous image                                 |
| A bad migration           | Assess before restoring — a restore loses every write since     |
| Value is being duplicated | **Disable the marketplace and the affected faucet immediately** |
| An account is compromised | Revoke all sessions for that account                            |

Feature flags exist for exactly this. Using one is not an admission of failure; it is the
mechanism working.

### 4. Fix

Prefer the smallest change that stops the harm. A full fix can follow once the incident is
contained.

### 5. Verify

- The symptom is gone.
- **Economy reconciliation balances.**
- No new errors.
- Affected players are in a correct state.

### 6. Write it up

Within 48 hours, while it is still accurate. See below.

---

## Investigating

```bash
curl -s http://localhost:4000/ready | jq        # what is down
pnpm infra:status
```

**Start from the correlation id.** If a player reports a problem, the id shown on their
support screen is the same id in the server logs. That is the whole reason it is echoed back.

```text
correlationId → API logs → the transaction → the outbox row → the worker logs
```

For an economy incident, the audit trail answers _who caused it and why_, and the ledger
answers _what moved_. Both are needed; neither substitutes for the other.

---

## Economy incidents specifically

1. **Contain immediately.** Disable the marketplace and the suspected faucet.
2. **Quantify.** How much value was created or destroyed? Reconciliation gives the total; the
   ledger gives the movements; audit gives the actors.
3. **Identify the affected accounts.**
4. **Decide the remedy.** Compensating ledger entries, not edits. A restore loses legitimate
   activity and should be a last resort.
5. **Be transparent with players.** In a game with a real economy, silence is read as
   concealment, and it is very hard to recover from.
6. **Add the invariant** that would have caught it, as an executable test.

Step 6 is the one that matters long term. Every economy incident should leave behind a test
that would have caught it.

---

## The write-up

Not to assign blame. **Systems fail; people work within them.** A write-up that names a
person produces a culture where incidents are hidden, which is strictly worse than incidents
happening.

```markdown
# Incident YYYY-MM-DD: <one line>

**Severity:** SEV-N
**Detected:** <time and how> **Resolved:** <time>
**Player impact:** <who, how many, what they experienced>

## What happened

Plain narrative.

## Timeline

| Time | Event |

## Root cause

The actual cause. Keep asking why until you reach something that can be changed.

## What went well

Genuinely. Detection, containment, communication.

## What did not

Honestly. Missing alerts, unclear runbooks, slow decisions.

## Actions

| Action | Owner | Why it prevents recurrence |
```

File in `docs/status/` and link from [risks](../status/RISKS.md).

---

## Currently missing

An honest list, because pretending otherwise would make this runbook useless:

- No alerting — every incident would be detected by a person noticing.
- No log aggregation — logs are per-container.
- No on-call.
- No status page.
- No production system to have an incident in.

Related: [Observability](../architecture/OBSERVABILITY_ARCHITECTURE.md) ·
[Backups](BACKUPS.md) ·
[Economy integrity rules](../constitution/ECONOMY_INTEGRITY_RULES.md)
