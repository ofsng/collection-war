# CLAUDE.md — Collection War

> **This file is a pointer, not a rulebook.** The canonical rules live in `docs/`.
> If this file and `docs/` ever disagree, **`docs/` wins** and this file is the bug.
> See [ADR-0018](docs/adr/ADR-0018-ai-tool-adapter-strategy.md).

---

## Project

**Collection War** — a creature collection, battle and marketplace game.

Web · Android · iOS, one authoritative backend, Turkish and English from day one.

Never use any other name for this project, anywhere: code, packages, database, routes,
comments, documentation, fixtures.

| Context             | Form                |
| ------------------- | ------------------- |
| Product             | `Collection War`    |
| Repository          | `collection-war`    |
| Package scope       | `@collection-war/*` |
| Technical namespace | `collection_war`    |

---

## Read these before acting

1. [`docs/README.md`](docs/README.md) — the map
2. [`docs/constitution/AI_AGENT_RULES.md`](docs/constitution/AI_AGENT_RULES.md) — **mandatory**
3. [`docs/status/CURRENT_STATE.md`](docs/status/CURRENT_STATE.md) — what is actually true today
4. The document for whatever you are changing

Step 3 is not optional. Most wasted effort here comes from assuming something exists that
does not.

---

## The five rules that are not negotiable

Everything else is in `docs/`. These are here because they must be seen even if no link is
followed.

### 1. Never claim something works unless you ran it and saw it work

Not "tests pass" — you ran `pnpm test` and observed the exit code.

Never claim infrastructure exists unless a command created it. Never claim you controlled
another application — writing a config file that another tool reads is **not** operating that
tool. Never claim a model was used unless the environment confirms it.

**Partial is an acceptable outcome. False is not.**

### 2. Do not start gameplay implementation

No creature systems, battle logic, marketplace transactions, economy operations, exploration,
habitats, PvE, PvP, balance, or seed data. Do not generate creature or material content.

Blocked until [CW-0002](docs/tasks/BACKLOG.md) is approved. This is the entire reason the
platform was bootstrapped separately.

### 3. Verify before reporting complete

```bash
nvm use          # Node 22 — the machine default is Node 18 and will not work
pnpm verify      # format → lint → typecheck → test → build
```

Paste the **real** summary. A failing stage means the work is not complete.

### 4. Do not weaken a check to make it pass

No skipped tests, loosened assertions, `eslint-disable`, or casts to `any` in order to get a
green result. If a check is wrong, **say so** — that is a finding, not an obstacle.

### 5. Never create anything that costs money, and never push

No cloud accounts, hosted databases, domains, deployments or billing. No `git push`, no pull
request, without explicit per-action approval.

---

## Commands

```bash
pnpm verify          # THE GATE — run before claiming anything is done
pnpm dev             # all applications
pnpm test            # unit tests
pnpm typecheck
pnpm lint
pnpm format
pnpm check:env       # diagnose a broken environment
pnpm check:docs      # audit docs: links, secrets, scope guards
pnpm infra:up        # local infrastructure (requires Docker)
pnpm infra:reset -- --yes   # DESTRUCTIVE — needs explicit confirmation
```

---

## Task packets

Anything non-trivial gets one:
[`docs/tasks/templates/TASK_PACKET_TEMPLATE.md`](docs/tasks/templates/TASK_PACKET_TEMPLATE.md)

A conversation is not project memory. A file in Git is.

Record in it: decisions made, commands actually run with their real results, what is left,
and any model fallback.

---

## Update the status documents when the truth changes

- [`docs/status/CURRENT_STATE.md`](docs/status/CURRENT_STATE.md)
- [`docs/status/RISKS.md`](docs/status/RISKS.md)
- [`docs/status/OPEN_DECISIONS.md`](docs/status/OPEN_DECISIONS.md)
- [`docs/status/DEFERRED_WORK.md`](docs/status/DEFERRED_WORK.md)
- [`docs/status/TECHNICAL_DEBT.md`](docs/status/TECHNICAL_DEBT.md)

Documentation lands in the **same change** as the behaviour it describes.

---

## Escalate

Stop and ask when: a schema decision spans domains · a security or trust boundary changes ·
economy rules change · a new infrastructure dependency is proposed · a cross-platform
contract changes · the monolith boundary would be violated · **two reasoned attempts have
failed** · an irreversible migration is proposed · two ADRs conflict.

Do **not** escalate formatting, syntax errors or straightforward test fixes. Fix them.

---

## Where things are

```text
apps/       web · admin · mobile · api · workers
packages/   13 shared packages — see docs/architecture/ARCHITECTURE_OVERVIEW.md
docs/       canonical documentation — THE SOURCE OF TRUTH
.claude/    rules, agents, commands (this tool)
.agents/    the same for Antigravity
```

Detailed rules per area: [`.claude/rules/`](.claude/rules/)
Specialised agents: [`.claude/agents/`](.claude/agents/)
Operating guide: [`docs/runbooks/AI_AGENT_OPERATIONS.md`](docs/runbooks/AI_AGENT_OPERATIONS.md)
