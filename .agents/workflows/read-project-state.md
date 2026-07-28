# Workflow: `/read-project-state`

**Purpose:** establish what is actually true before planning anything.

## Read, in order

1. [`docs/status/CURRENT_STATE.md`](../../docs/status/CURRENT_STATE.md)
2. [`docs/status/RISKS.md`](../../docs/status/RISKS.md)
3. [`docs/status/OPEN_DECISIONS.md`](../../docs/status/OPEN_DECISIONS.md)
4. [`docs/status/DEFERRED_WORK.md`](../../docs/status/DEFERRED_WORK.md)
5. [`docs/status/TECHNICAL_DEBT.md`](../../docs/status/TECHNICAL_DEBT.md)
6. [`docs/tasks/BACKLOG.md`](../../docs/tasks/BACKLOG.md)
7. Anything in [`docs/tasks/active/`](../../docs/tasks/active/)

## Then verify, rather than trusting

```bash
node --version && pnpm --version
docker compose version || echo "docker: NOT AVAILABLE"
git status --short && git log --oneline -5
```

## Report

- **Verified** — what exists, and by which command
- **Unverified** — what exists but has never been executed
- **Absent** — what does not exist
- Top risks
- The recommended next task

## The most useful output

**If a status document disagrees with what you just observed, say so.**

That divergence is more valuable than the summary. It means a document is stale, and a stale
status document is trusted right up until it causes a wrong decision.

## Do not

- Summarise the documents without checking them against reality
- Describe an unverified thing as working
- Skip the "absent" section — it is where the surprises are
