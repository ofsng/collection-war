# Workflow: `/finish-task`

**Purpose:** close a task honestly.

## 1. Verify

```bash
nvm use && pnpm verify
```

**Paste the real summary.** If any stage failed, the task is **not** complete — go to step 5
and mark it partial.

## 2. Complete the task packet

- [ ] **Commands executed** — the real ones, with their real results
- [ ] **Results** — what actually happened, **including failures**
- [ ] **Decisions made** — and whether any needs an ADR
- [ ] **Escalations** — and what was decided
- [ ] **Remaining work** — blocked, deferred or out of scope; say which
- [ ] **Handoff summary**
- [ ] Any model fallback recorded

A packet with no failures recorded is usually a packet where they were omitted.

## 3. Documentation

- [ ] Changed in the **same** commit as the behaviour
- [ ] ADR written if a real decision was made
- [ ] Status documents updated:
      [CURRENT_STATE](../../docs/status/CURRENT_STATE.md) ·
      [RISKS](../../docs/status/RISKS.md) ·
      [OPEN_DECISIONS](../../docs/status/OPEN_DECISIONS.md) ·
      [DEFERRED_WORK](../../docs/status/DEFERRED_WORK.md) ·
      [TECHNICAL_DEBT](../../docs/status/TECHNICAL_DEBT.md)

## 4. Move the packet

`docs/tasks/active/` → `docs/tasks/completed/`

**Only if every acceptance criterion is met and `verify` is green.**

## 5. If it is not complete

Mark it **partially complete** and say exactly what is missing and why.

**This is a legitimate outcome.** A packet recording "eleven of twelve gates pass; the twelfth
is blocked because Docker is not installed" is a good packet. One claiming twelve is a broken
project.

Leave it in `active/` with a clear handoff.

## 6. Report

Use the template in
[AI_AGENT_RULES.md](../../docs/constitution/AI_AGENT_RULES.md#the-honest-report-template):

what I did · commands run and their real results · what I did **not** do · what is
**unverified** · decisions and escalations.

## Never

- Claim completion without a green `verify`
- Describe unverified work as working
- Omit a failure because the rest went well
- Push, or open a pull request, without explicit approval
