# agents.md — Collection War

> Configuration for **Google Antigravity** and other `agents.md`-aware tools.
>
> **This file is a pointer, not a rulebook.** The canonical rules live in `docs/`.
> If this file and `docs/` disagree, **`docs/` wins** and this file is the bug.
> See [ADR-0018](docs/adr/ADR-0018-ai-tool-adapter-strategy.md).

---

## Project

**Collection War** — a creature collection, battle and marketplace game.
Web · Android · iOS, one authoritative backend, Turkish and English from day one.

Never use any other name, anywhere: code, packages, database, routes, comments, fixtures.

| Context             | Form                |
| ------------------- | ------------------- |
| Product             | `Collection War`    |
| Repository          | `collection-war`    |
| Package scope       | `@collection-war/*` |
| Technical namespace | `collection_war`    |

---

## Read before acting

1. [`docs/README.md`](docs/README.md) — the map
2. [`docs/constitution/AI_AGENT_RULES.md`](docs/constitution/AI_AGENT_RULES.md) — **mandatory**
3. [`docs/status/CURRENT_STATE.md`](docs/status/CURRENT_STATE.md) — what is actually true
4. The document for whatever you are changing

---

## The five rules that are not negotiable

### 1. Never claim something works unless you ran it and saw it work

Not "tests pass" — you ran `pnpm test` and observed the exit code.

Never claim infrastructure exists unless a command created it. **Never claim you controlled
another application** — writing a config file another tool reads is not operating that tool.
Never claim a model was used unless the environment confirms it.

**Partial is an acceptable outcome. False is not.**

### 2. Do not start gameplay implementation

No creature systems, battle logic, marketplace transactions, economy operations, exploration,
habitats, PvE, PvP, balance or seed data. No creature or material content.

Blocked until [CW-0002](docs/tasks/BACKLOG.md) is approved.

### 3. Verify before reporting complete

```bash
nvm use          # Node 22 — the machine default is Node 18 and will not work
pnpm verify
```

### 4. Do not weaken a check to make it pass

No skipped tests, loosened assertions, `eslint-disable`, or casts to `any`. If a check is
wrong, **say so**.

### 5. Never create anything that costs money, and never push

No cloud accounts, hosted databases, domains, deployments or billing. No `git push` and no
pull request without explicit per-action approval.

---

## Antigravity structure

```text
.agents/
├── rules/        pointers to canonical rules per area
├── skills/       reusable procedures (none yet, deliberately)
└── workflows/    the named procedures below
```

### Workflows

| Workflow                    | Purpose                                                 |
| --------------------------- | ------------------------------------------------------- |
| `/bootstrap-check`          | Verify the environment before doing anything            |
| `/read-project-state`       | What is actually true right now                         |
| `/create-task-packet`       | Start a unit of work properly                           |
| `/write-specification`      | Specify before implementing                             |
| `/architecture-review`      | Review a structural change                              |
| `/implement-vertical-slice` | Build one thin, complete slice                          |
| `/review-vertical-slice`    | Review one                                              |
| `/security-review`          | The security checklist                                  |
| `/economy-review`           | The economy checklist — **mandatory** for value changes |
| `/finish-task`              | Verify, document, close                                 |
| `/handoff-task`             | Hand over mid-flight                                    |

Each references canonical documents rather than restating them.

---

## Commands

```bash
pnpm verify          # THE GATE
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm check:env
pnpm infra:up
```

---

## Escalate

A schema decision spanning domains · a trust boundary change · economy rules · new
infrastructure · a cross-platform contract change · a monolith boundary violation ·
**two failed attempts** · an irreversible migration · conflicting ADRs.

Do **not** escalate formatting, syntax errors or straightforward test fixes.

---

## Model routing

Route by **risk**, not habit.

- **Strongest reasoning** — architecture, security, economy, schema design, complex debugging
- **Balanced** — standard implementation, endpoints, UI, tests
- **Fast** — formatting, index updates, mechanical documentation

If the preferred tier is unavailable: use the strongest available, **record the fallback in
the task packet**, and do not claim the preferred model was used.

---

Detailed rules: [`.agents/rules/`](.agents/rules/) ·
Operating guide: [`docs/runbooks/AI_AGENT_OPERATIONS.md`](docs/runbooks/AI_AGENT_OPERATIONS.md)
