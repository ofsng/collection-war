---
description: Create a task packet for a new piece of work
---

Create a task packet for: $ARGUMENTS

1. Read `docs/tasks/README.md` and `docs/tasks/templates/TASK_PACKET_TEMPLATE.md`.
2. Find the next free `CW-NNNN` id by listing `docs/tasks/active/` and
   `docs/tasks/completed/`.
3. Create `docs/tasks/active/CW-NNNN-<kebab-title>.md` from the template.
4. Fill in everything you can determine now. In particular:
   - **Non-goals** — be generous; this is what prevents scope creep
   - **Allowed files** and **forbidden files** — before any work starts
   - **Assumptions** — everything assumed rather than verified
   - **Acceptance criteria** — checkable, not "works well"
5. Leave the execution sections (commands, results, handoff) empty until the work happens.

If the task touches currency, inventory or ownership, the economy considerations section is
**required** — not "N/A".

If the task is gameplay implementation, **stop**: that is blocked until
[CW-0002](../../docs/tasks/BACKLOG.md) is approved. Say so instead of creating the packet.
