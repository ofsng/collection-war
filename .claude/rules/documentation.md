# Rule: Documentation

**Canonical:** [DOCUMENTATION_RULES.md](../../docs/constitution/DOCUMENTATION_RULES.md) ·
[docs/README.md](../../docs/README.md)

---

## `docs/` is the source of truth

Not a chat history. Not an AI tool's memory. Not a ticket. **If it matters and it is not in
`docs/`, it will be lost.**

`CLAUDE.md`, `.claude/`, `agents.md` and `.agents/` are **thin pointers**. They must never
restate architecture or rules. Two copies of a rule become two different rules.

## Say why, not just what

The conclusion is the least valuable part. A rule without its reasoning gets "simplified
away" by the next person, who cannot see what it was protecting.

```markdown
Use cursor pagination. ← will be broken
Use cursor pagination. Offset pagination silently hides ← will be remembered
rows when the list changes between requests, and
OFFSET 10000 makes the database walk 10,000 rows it
then discards.
```

## Never claim unverified things work

If a command was not run, say so. If a service was never started, say so. If something is
designed but not built, label it.

This applies with particular force to `status/` documents.

## Mechanics

- **Relative links only** — they work in GitHub, editors and Obsidian
- **Mermaid in fenced blocks** — diagrams that diff and cannot drift
- **Standard Markdown** — no Dataview, no Templater, **no `[[wikilinks]]`**
- **Date everything perishable**, absolutely (`2026-07-28`), never "recently"
- **Link, do not duplicate**
- **Delete what is wrong** — except ADRs, which are superseded, never edited

## Update in the same change

A change that alters behaviour updates its documentation **in the same commit**.
Documentation updated "later" is documentation updated never.

## Code comments

Explain the **why**. The code already says the what.

```ts
// Bad
counter += 1; // increment the counter

// Good
// `maxRetriesPerRequest: null` is MANDATORY for BullMQ. Its blocking commands legitimately
// wait a long time; with a retry cap, ioredis aborts them and reports spurious errors.
```

## Templates exist so a rushed document still contains what matters

[Feature](../../docs/specifications/templates/FEATURE_SPEC_TEMPLATE.md) ·
[Domain](../../docs/specifications/templates/DOMAIN_SPEC_TEMPLATE.md) ·
[API](../../docs/specifications/templates/API_SPEC_TEMPLATE.md) ·
[Data model](../../docs/specifications/templates/DATA_MODEL_TEMPLATE.md) ·
[Threat model](../../docs/specifications/templates/THREAT_MODEL_TEMPLATE.md) ·
[Task packet](../../docs/tasks/templates/TASK_PACKET_TEMPLATE.md)
