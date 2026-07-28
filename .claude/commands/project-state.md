---
description: Report the verified current state of the project
---

Report what is **actually true** about Collection War right now.

Read, in order:

1. `docs/status/CURRENT_STATE.md`
2. `docs/status/RISKS.md`
3. `docs/status/OPEN_DECISIONS.md`
4. `docs/status/DEFERRED_WORK.md`
5. `docs/tasks/BACKLOG.md`

Then verify the environment rather than trusting the documents:

```bash
node --version
pnpm --version
docker compose version || echo "docker: NOT AVAILABLE"
git status --short
```

Report:

- What exists and is **verified** — and by which command
- What exists but is **unverified**
- What does **not** exist
- The top risks
- The recommended next task

**If a status document disagrees with what you just observed, say so.** That divergence is
the most useful thing in the report, and it means the document needs updating.
