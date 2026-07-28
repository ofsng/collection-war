# Workflow: `/security-review`

**Purpose:** find what an attacker would find, and confirm we would notice if they did.

**Canonical:** [Security review checklist](../../docs/security/SECURITY_REVIEW_CHECKLIST.md) ·
[Security rules](../../docs/constitution/SECURITY_RULES.md) ·
[Threat model](../../docs/security/THREAT_MODEL.md)

## Required for

Authentication or authorization · any new endpoint · file uploads · admin capabilities ·
anything touching value or personal data · any new dependency.

## Run the checklist

Work through
[SECURITY_REVIEW_CHECKLIST.md](../../docs/security/SECURITY_REVIEW_CHECKLIST.md) — sections
A through H, plus the economy section where it applies.

Do not skip sections because they "obviously" pass. Section B (authorization) is where the
real bugs are, and step 3 — **does this actor own _this_ resource** — is the one that gets
forgotten.

## Then ask what the checklist cannot

1. **What would I try first if I wanted to exploit this?**
2. What if this request arrives ten times simultaneously?
3. What if it is retried after a timeout?
4. What if the client lies about every value it sends?
5. What if the device clock is set to next year?
6. What is the maximum value extractable per hour?
7. **Would we notice? How?**
8. What does this leak that it does not need to?

**Question 7 is the one most often skipped.** Assume at least one mitigation will fail;
detection is what remains.

## Output

For each finding:

| Field            | Content                            |
| ---------------- | ---------------------------------- |
| Threat           | What an attacker does              |
| Likelihood       | High / medium / low                |
| Impact           | What they get                      |
| **Required fix** | **Specific.** Not "add validation" |
| Test             | The test that proves the fix works |

**A mitigation without a test is an intention.**

## Never

- Approve a missing authorization check
- Approve a client-authoritative decision
- Approve a stack trace, SQL or hostname reaching a client
- **Write an exploit or a proof-of-concept attack**
- Report a vulnerability publicly with a reproduction recipe — tell the maintainer directly

## Escalate

A trust-boundary change · a vulnerability in existing code · anything needing legal input ·
a risk somebody wants to accept (record it in
[RISKS.md](../../docs/status/RISKS.md) with who accepted it and when to revisit).
