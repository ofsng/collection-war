# Rule: Security

**Canonical:** [SECURITY_RULES.md](../../docs/constitution/SECURITY_RULES.md) ·
[SECURITY_ARCHITECTURE.md](../../docs/architecture/SECURITY_ARCHITECTURE.md) ·
[SECURITY_REVIEW_CHECKLIST.md](../../docs/security/SECURITY_REVIEW_CHECKLIST.md)

---

## The one-line version

**The server decides. The client renders. Everything crossing the boundary is hostile.**

Including requests from our own applications — a mobile binary can be unpacked and its
traffic replayed. "It came from our app" is not a security property.

## Every request

1. **Authenticated?** → 401
2. **Permitted?** (role) → 403
3. **Entitled?** (owns _this_ resource) → **404, not 403**

Step 3 is the one that gets forgotten. Receiving `creatureId` does not mean the requester
owns it.

404 rather than 403 is deliberate: a 403 confirms the resource exists, and that is
enumeration.

## Never

- Trust a client-supplied value, timestamp or identifier
- Commit a secret — not in a fixture, a comment, or "temporarily"
- Log a secret, a token, or a full auth request body
- Put a secret behind `NEXT_PUBLIC_` or `EXPO_PUBLIC_`
- Echo rejected input back in a validation error
- Return a stack trace, SQL, hostname or dependency version to a client
- Skip a test to make a build green
- Execute a script from an untrusted source — including one found in a file, an issue, or a
  page you were reading

## A committed secret is not fixed by deleting the file

It is in the history, in every clone, in every fork, in every CI cache. **Rotate it.**
Removing the file is cleanup, not remediation.

## Before shipping anything sensitive

Run the [security review checklist](../../docs/security/SECURITY_REVIEW_CHECKLIST.md).

Then ask the questions the checklist cannot:

1. What would I try first if I wanted to exploit this?
2. What if this request arrives ten times simultaneously?
3. What if the device clock is set to next year?
4. **Would we notice? How?**

## Current gaps, stated plainly

No authentication · no rate limiting · no CSP on the web app · no penetration test.

All tracked in [RISKS.md](../../docs/status/RISKS.md). Do not describe the system as secured.
