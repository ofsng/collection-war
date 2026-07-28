# Workflow: `/create-task-packet`

**Purpose:** start a unit of work properly, so it survives the session.

**Canonical:** [`docs/tasks/README.md`](../../docs/tasks/README.md) ·
[template](../../docs/tasks/templates/TASK_PACKET_TEMPLATE.md)

## Steps

1. Run `/read-project-state` first — do not plan against assumptions.
2. Find the next free `CW-NNNN` from `docs/tasks/active/` and `docs/tasks/completed/`.
3. Copy the template to `docs/tasks/active/CW-NNNN-<kebab-title>.md`.
4. Fill in everything determinable **now**.
5. Leave execution sections (commands, results, handoff) empty until work happens.

## The fields that matter most before starting

| Field                         | Why it must be filled in first                             |
| ----------------------------- | ---------------------------------------------------------- |
| **Non-goals**                 | The only reliable defence against scope creep. Be generous |
| **Allowed / forbidden files** | Stops a focused change becoming an unrelated refactor      |
| **Assumptions**               | When a task fails, a wrong assumption is usually why       |
| **Acceptance criteria**       | Checkable, not "works well"                                |

## Required sections for certain work

- Touches currency, inventory or ownership → **economy considerations is required**, not N/A
- New endpoint or auth surface → **security considerations is required**
- New user-facing text → **localization considerations is required**

## Stop conditions

**If this is gameplay implementation, stop.** It is blocked until
[CW-0002](../../docs/tasks/BACKLOG.md) is approved. Say so rather than creating the packet.

**If this would create a paid resource, stop.** That needs owner approval.
