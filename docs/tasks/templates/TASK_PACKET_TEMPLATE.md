# CW-NNNN: <Title>

- **Status:** Not started | In progress | Blocked | Complete | Partially complete
- **Owner / agent:**
- **Created:** YYYY-MM-DD
- **Updated:** YYYY-MM-DD

---

## Objective

One paragraph. What this task achieves.

## Business reason

Why it is worth doing now. If this is hard to write, the task may not be worth doing now.

## Context

What a person picking this up cold needs to know. Prior decisions, constraints, relevant
history.

## Scope

Specifically what will be done.

## Non-goals

Specifically what will **not** be done, including things a reasonable person might assume are
included. This is the field that prevents scope creep.

## Related domains

## Related ADRs

## Relevant documentation

Read these before starting.

## Allowed files

Paths or globs this task may modify.

## Forbidden files

Paths this task must **not** touch. Be explicit about anything sensitive, generated, or owned
by other in-flight work.

## Dependencies

Other tasks, decisions or external things this is waiting on.

## Assumptions

Everything assumed rather than verified. **If an assumption turns out to be wrong, that is
usually why the task failed** — so writing them down is what makes the failure diagnosable.

## Acceptance criteria

Checkable, unambiguous conditions. Not "works well" — "`pnpm verify` passes" and
"a retried purchase returns the original order id".

- [ ]
- [ ]

## Required tests

| Level              | What must be covered |
| ------------------ | -------------------- |
| Unit               |                      |
| Integration        |                      |
| E2E                |                      |
| Economy invariants |                      |

## Security considerations

Authorization, input validation, secrets, audit. Reference a threat model if there is one.

## Economy considerations

Faucets, sinks, transactions, idempotency, ledger entries. **N/A only if this genuinely does
not touch value.**

## Localization considerations

New strings, both locales, formatting.

## Accessibility considerations

Semantics, keyboard, touch targets, announcements.

## Performance considerations

Expected volume, hot paths, indexes.

---

## Decisions made

Choices made during the work, and why. A decision with lasting consequences becomes an ADR.

| Decision | Reasoning | ADR? |
| -------- | --------- | ---- |

## Escalations

Anything escalated, to whom, and what was decided while waiting.

## Commands executed

**Real commands, real results. Exit codes, not impressions.**

```text
$ <command>
<actual output, or a faithful summary>
→ PASS | FAIL
```

## Results

What actually happened. Include failures. A packet with no failures recorded is usually a
packet where they were omitted.

## Remaining work

What is not done, and why. Blocked, deferred, or out of scope — say which.

## Handoff summary

For whoever continues this. What state is it in? What is the next concrete action? What would
you warn them about?

---

## Completion checklist

- [ ] Every acceptance criterion met, or explicitly not met with a reason
- [ ] `pnpm verify` passes and its **real** output is recorded above
- [ ] Documentation updated in the same change
- [ ] Status documents updated
- [ ] No unsupported completion claim anywhere in this packet
- [ ] Moved to `completed/`
