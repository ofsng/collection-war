# ADR-0018: Thin AI tool adapters over canonical documentation

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Collection War is developed with AI assistance, and more than one tool is in use — Claude
Code and Google Antigravity, with others possible. Each expects its own configuration format:
`CLAUDE.md` and `.claude/`, `agents.md` and `.agents/`.

The obvious approach — writing the project's architecture and rules into each tool's
configuration — creates a specific failure: **two copies of a rule become two different
rules**, and the one a given agent happens to read wins. Nobody notices until the divergence
causes a bug.

## Decision

**Canonical rules live in `docs/`. Tool configurations are thin adapters that point at them.**

| File                  | Contains                                                               | Does NOT contain                            |
| --------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| `CLAUDE.md`           | Identity, reading order, safety rules, verification commands, workflow | Architecture, domain design, detailed rules |
| `.claude/rules/*`     | Per-area pointers and the few tool-specific practices                  | Duplicated architecture                     |
| `.claude/agents/*`    | Role definitions: mission, allowed actions, forbidden actions, outputs | Duplicated architecture                     |
| `agents.md`           | The same for Antigravity                                               | The same                                    |
| `.agents/workflows/*` | Procedures that reference canonical documents                          | The same                                    |

**No `.cursorrules` and no `.cursorignore`** — those are Cursor-specific and are explicitly
out of scope.

The binding rules for AI agents live in one place:
[AI agent rules](../constitution/AI_AGENT_RULES.md).

## Alternatives considered

**Full rules duplicated per tool.** Each agent has everything without following a link.
Rejected: guaranteed divergence, and every rule change becomes an N-place edit that will be
done in N−1 places.

**One tool only.** Simplest. Rejected: the project is genuinely used from more than one, and
prohibiting a tool does not make its configuration file stop being read.

**Generating tool configurations from canonical documents.** Attractive — one source, many
outputs. Rejected as premature: a generator is a build step and a thing to maintain, for two
adapter files. Revisit if the number grows.

**No AI configuration at all.** Rejected: without it, every session re-derives the project's
conventions and gets them subtly wrong.

## Positive consequences

- **One place to change a rule**, and every tool sees the change.
- Adding a tool means adding a pointer file, not re-authoring the rules.
- Canonical documents are reviewed once, properly.
- Human contributors read the same documents as the agents.
- Divergence between tools is structurally difficult.

## Negative consequences

- An agent must **follow a link** to get the detail, which costs a step and some context.
- Adapter files still need maintaining when their tool's format changes.
- A tool with a small context budget may not follow every pointer. Mitigated by putting the
  genuinely non-negotiable rules — verify before claiming completion, do not start gameplay,
  do not push — directly in the adapter, and only the detail behind links.

## Risks

- **An adapter drifting into a second source of truth**, one convenient sentence at a time.
  Mitigated by review and by the rule being stated in
  [documentation rules](../constitution/DOCUMENTATION_RULES.md).
- A tool ignoring its configuration file entirely. Nothing to do about that except not rely
  on configuration alone for anything safety-critical — which is why the _verification gate_
  (`pnpm verify`) is a command with an exit code rather than an instruction.

## Review conditions

- More than three tools need adapters → consider generating them from canonical documents.
- An adapter is found to contradict `docs/` → treat as a defect and fix the adapter, never
  the canonical document.
