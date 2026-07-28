# Documentation Rules

> **Binding.** Audience: anyone writing in `docs/`, or writing a README, or writing a comment.

---

## 1. `docs/` is the single source of truth

Architecture, decisions, domain design, operations and security live here, in Git, in
Markdown.

Not in a chat history. Not in an AI tool's memory. Not in a ticket description. Not in a
proprietary format only one person can open. If it matters and it is not here, it will be
lost.

## 2. Tool configuration files are pointers, not copies

`CLAUDE.md`, `agents.md`, `.claude/` and `.agents/` are **thin adapters**. They tell a tool
where the canonical documents are and how to work here. They must not restate architecture
or rules.

**Why:** two copies of a rule become two different rules. The one the reader happens to
open wins, and nobody notices the drift until it causes a bug.

## 3. Say why, not just what

The conclusion is the least valuable part of a document. A rule without its reasoning gets
"simplified away" by the next person, who cannot see what it was protecting.

> Use cursor pagination.

versus

> Use cursor pagination. Offset pagination is wrong here for two reasons: rows shift between
> requests, so a listing sold while the player is on page 2 silently hides an unrelated one
> they never saw; and `OFFSET 10000` makes the database walk 10,000 rows it discards.

The second survives contact with a developer in a hurry.

## 4. Never claim unverified things work

If a command was not run, say so. If a service was never started, say so. If something is
designed but not built, label it.

This applies with particular force to status documents and to anything written by an AI
agent. See [AI agent rules](AI_AGENT_RULES.md).

## 5. Write for a specific reader

Say at the top who the document is for. "Anyone writing code that touches currency" is
useful. Documentation addressed to nobody in particular gets read by nobody in particular.

## 6. Date perishable facts

Anything in [`status/`](../status/) carries a date. Use absolute dates (`2026-07-28`), never
"recently" or "last week" — those are meaningless six months later, which is exactly when
someone will read it.

## 7. Relative links only

`[dependency rules](../architecture/DEPENDENCY_RULES.md)` works in GitHub, VS Code, Obsidian
and a plain text editor. Absolute paths and wikilinks do not.

## 8. Link, do not duplicate

If a rule already exists somewhere, link to it. Copying it creates a second copy that will
eventually disagree with the first.

## 9. Standard Markdown, no plugin syntax

`docs/` must be readable in any Markdown tool. Mermaid in fenced blocks is fine — GitHub and
Obsidian both render it, and it degrades to readable text elsewhere. Dataview queries,
Templater syntax and similar are not.

## 10. Diagrams as text

Mermaid, in a fenced block. It diffs, it reviews, it cannot drift out of sync with a binary
nobody can open, and it does not require a licence to edit.

## 11. Delete what is wrong

A wrong document is worse than a missing one, because it is trusted. When something is
superseded, delete it or mark it superseded — do not leave it to be discovered.

The exception is [ADRs](../adr/README.md): those are immutable by design. Supersede, never
edit.

## 12. Update documentation in the same change

A change that alters behaviour updates its documentation in the same commit. Documentation
updated "later" is documentation updated never.

---

## Code comments

Comments in code follow the same principle as documents: **explain the why**.

```ts
// Bad — restates the code.
// Increment the counter
counter += 1;

// Good — explains a decision the code cannot express.
// `maxRetriesPerRequest: null` is MANDATORY for BullMQ. Its blocking commands legitimately
// wait a long time; with a retry cap, ioredis aborts them and BullMQ reports spurious
// connection errors.
```

Comment when: a decision is non-obvious · a constraint is external · a subtlety would
otherwise be "cleaned up" · the code is correct but looks wrong.

Do not comment: what the code plainly says · a function whose name already explains it ·
code you deleted (Git remembers).

---

## Templates

Use them. They exist so that a document written under time pressure still contains the parts
that turn out to matter.

- [Feature specification](../specifications/templates/FEATURE_SPEC_TEMPLATE.md)
- [Domain specification](../specifications/templates/DOMAIN_SPEC_TEMPLATE.md)
- [API specification](../specifications/templates/API_SPEC_TEMPLATE.md)
- [Data model](../specifications/templates/DATA_MODEL_TEMPLATE.md)
- [Threat model](../specifications/templates/THREAT_MODEL_TEMPLATE.md)
- [Task packet](../tasks/templates/TASK_PACKET_TEMPLATE.md)
- [ADR](../adr/README.md#template)

---

## File naming

| Location       | Convention                | Example                                     |
| -------------- | ------------------------- | ------------------------------------------- |
| `docs/**`      | `SCREAMING_SNAKE_CASE.md` | `DATA_ARCHITECTURE.md`                      |
| `docs/adr/`    | `ADR-NNNN-kebab-title.md` | `ADR-0005-modular-monolith.md`              |
| `docs/tasks/`  | `CW-NNNN-kebab-title.md`  | `CW-0001-development-platform-bootstrap.md` |
| Domain folders | `kebab-case/README.md`    | `owned-creatures/README.md`                 |
| Source files   | `kebab-case.ts`           | `all-exceptions.filter.ts`                  |

Related: [Documentation index](../README.md) · [AI agent rules](AI_AGENT_RULES.md)
