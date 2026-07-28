# Collection War — Documentation

This directory is the **canonical source of truth** for Collection War's architecture,
decisions, domain design, operations and security posture.

Everything that matters lives here, in Git, in plain Markdown. Nothing important is stored
only in a chat history, an AI tool's memory, a ticket, or somebody's head.

---

## Start here

| If you are...                        | Read, in this order                                                                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New to the project**               | [Product vision](product/PRODUCT_VISION.md) → [Architecture overview](architecture/ARCHITECTURE_OVERVIEW.md) → [Domain map](domains/DOMAIN_MAP.md) → [Local development](runbooks/LOCAL_DEVELOPMENT.md) |
| **About to write code**              | [Engineering principles](constitution/ENGINEERING_PRINCIPLES.md) → [Dependency rules](architecture/DEPENDENCY_RULES.md) → the relevant [domain](domains/) → [Testing runbook](runbooks/TESTING.md)      |
| **An AI agent**                      | [AI agent rules](constitution/AI_AGENT_RULES.md) — **mandatory before any action** → [AI agent operations](runbooks/AI_AGENT_OPERATIONS.md)                                                             |
| **Reviewing a change**               | [Security review checklist](security/SECURITY_REVIEW_CHECKLIST.md) → [Economy integrity rules](constitution/ECONOMY_INTEGRITY_RULES.md)                                                                 |
| **Wondering "why is it like this?"** | [Architecture decision records](adr/README.md)                                                                                                                                                          |
| **Wondering "what state is it in?"** | [Current state](status/CURRENT_STATE.md) → [Open decisions](status/OPEN_DECISIONS.md) → [Risks](status/RISKS.md)                                                                                        |

---

## Structure

```text
docs/
├── constitution/    Non-negotiable rules. Changing one requires an ADR.
├── product/         What Collection War is, and what it deliberately is not.
├── architecture/    How the system is built. C4-style, with Mermaid diagrams.
├── domains/         One document per bounded context: data, interfaces, events, limits.
├── adr/             Why each significant decision was made, and when to revisit it.
├── specifications/  Templates and per-module designs written BEFORE implementation.
├── tasks/           Task packets — the unit of work. Not a replacement for Git history.
├── runbooks/        How to actually do things: run it, test it, migrate it, fix it.
├── security/        Threat model, auth, secrets, supply chain, review checklists.
├── status/          What is true right now: state, risks, debt, open decisions.
└── generated/       Machine-generated output. Never hand-edited.
```

### The four kinds of document, and the difference between them

Mixing these up is how documentation rots, so it is worth being precise:

- **`constitution/`** — rules that hold across the whole project, indefinitely. Rare, short,
  and binding. Contradicting one is a bug, not a style choice.
- **`architecture/`** — the current design. Updated when the design changes. Describes what
  IS and what is INTENDED, and says which is which.
- **`adr/`** — a decision at a point in time, with its context and alternatives. **Immutable
  once accepted.** A superseded ADR is marked superseded, never edited to say something else.
  This is the difference between a decision log and a wiki.
- **`status/`** — perishable facts. Always dated. Assume anything here is stale unless the
  date says otherwise.

---

## Rules for writing here

Full detail in [Documentation rules](constitution/DOCUMENTATION_RULES.md). The short version:

1. **State the reasoning, not just the conclusion.** "Use cursor pagination" is a rule
   somebody will break. "Use cursor pagination, because offset pagination silently hides
   rows when the list changes between requests" is a rule they will remember.
2. **A document with no reader has no purpose.** Say who it is for at the top.
3. **Never claim something works unless it has been verified.** If a command was not run,
   say so. See [AI agent rules](constitution/AI_AGENT_RULES.md).
4. **Relative links only.** They work in GitHub, in an editor, and in Obsidian.
5. **Date anything perishable.** Absolute dates (`2026-07-28`), never "last week".
6. **Do not duplicate.** Link instead. Two copies of a rule become two different rules.

---

## Using Obsidian (optional)

`docs/` is written to work as an [Obsidian](https://obsidian.md) vault, because a large
linked documentation set is much easier to navigate with backlinks and a graph view.

**Obsidian is entirely optional.** It is not installed, not required, and not a dependency
of anything. Every document is standard Markdown that renders correctly in GitHub, VS Code,
any Markdown editor, and `cat`.

### Opening the vault

1. Install Obsidian yourself from <https://obsidian.md> — the project does not install it.
2. Open Obsidian → **Open folder as vault**.
3. Select this `docs/` directory (not the repository root).
4. Done. **No plugin is required**, and none should be needed to read anything here.

### What is deliberately avoided

So that the documentation stays readable outside Obsidian:

- **No plugin-specific syntax** in any content that matters. Dataview queries, Templater
  syntax and similar render as broken text everywhere else.
- **No `[[wikilinks]]` for navigation.** Standard `[text](path.md)` links work in GitHub and
  in every editor; wikilinks do not.
- **No committed Obsidian state.** `docs/.obsidian/workspace*`, caches and plugin folders are
  git-ignored — they are per-machine and would conflict on every pull.

If you configure Obsidian to your taste, keep it local. Do not commit your workspace.

---

## Diagrams

Diagrams are [Mermaid](https://mermaid.js.org) in fenced code blocks, which means they are
**text**: they diff, they review, and they cannot drift out of sync with a binary that
nobody can edit. GitHub and Obsidian both render them natively.

The rule from [Architecture principles](constitution/ARCHITECTURE_PRINCIPLES.md): a diagram
must correspond to something that actually exists in the repository. A decorative diagram of
a system nobody built is worse than no diagram, because it will be believed.

---

## Full index

### Constitution — binding rules

- [Engineering principles](constitution/ENGINEERING_PRINCIPLES.md)
- [Architecture principles](constitution/ARCHITECTURE_PRINCIPLES.md)
- [Security rules](constitution/SECURITY_RULES.md)
- [Economy integrity rules](constitution/ECONOMY_INTEGRITY_RULES.md)
- [Documentation rules](constitution/DOCUMENTATION_RULES.md)
- [AI agent rules](constitution/AI_AGENT_RULES.md)

### Product

- [Product vision](product/PRODUCT_VISION.md) · [Product principles](product/PRODUCT_PRINCIPLES.md)
- [MVP scope](product/MVP_SCOPE.md) · [Future scope](product/FUTURE_SCOPE.md) · [Non-goals](product/NON_GOALS.md)
- [Glossary](product/GLOSSARY.md)

### Architecture

- [Overview](architecture/ARCHITECTURE_OVERVIEW.md)
- [System context](architecture/SYSTEM_CONTEXT.md) · [Containers](architecture/CONTAINER_ARCHITECTURE.md) · [Components](architecture/COMPONENT_ARCHITECTURE.md)
- [Module boundaries](architecture/MODULE_BOUNDARIES.md) · [Dependency rules](architecture/DEPENDENCY_RULES.md)
- [Data](architecture/DATA_ARCHITECTURE.md) · [API](architecture/API_ARCHITECTURE.md) · [Events](architecture/EVENT_ARCHITECTURE.md)
- [Security](architecture/SECURITY_ARCHITECTURE.md) · [Localization](architecture/LOCALIZATION_ARCHITECTURE.md) · [Observability](architecture/OBSERVABILITY_ARCHITECTURE.md)
- [Deployment](architecture/DEPLOYMENT_ARCHITECTURE.md) · [Scaling](architecture/SCALING_STRATEGY.md) · [Cost](architecture/COST_STRATEGY.md)

**Game architecture**

- [Game architecture](architecture/GAME_ARCHITECTURE.md) · [State ownership](architecture/GAME_STATE_OWNERSHIP.md) · [Client sync](architecture/GAME_CLIENT_SYNC.md)
- [Randomness & replay](architecture/RANDOMNESS_AND_REPLAY.md) · [Transaction boundaries](architecture/TRANSACTION_BOUNDARIES.md) · [Content versioning](architecture/CONTENT_VERSIONING.md)
- [Domain events](architecture/DOMAIN_EVENT_CATALOG.md) · [Background jobs](architecture/BACKGROUND_JOB_CATALOG.md)
- [Authorization matrix](architecture/AUTHORIZATION_MATRIX.md) · [Anti-cheat](architecture/ANTI_CHEAT_ARCHITECTURE.md)
- [Diagrams](architecture/diagrams/)

### Domains

- [Domain index](domains/README.md) · [Domain map](domains/DOMAIN_MAP.md) · [Shared kernel](domains/SHARED_KERNEL.md)

### Decisions

- [ADR index](adr/README.md)

### Working

- [Specifications](specifications/README.md) · [Tasks](tasks/README.md) · [Backlog](tasks/BACKLOG.md)

### Runbooks

- [Local development](runbooks/LOCAL_DEVELOPMENT.md) · [Testing](runbooks/TESTING.md) · [Database](runbooks/DATABASE.md) · [Migrations](runbooks/MIGRATIONS.md)
- [Dependencies](runbooks/DEPENDENCY_MANAGEMENT.md) · [Releases](runbooks/RELEASES.md) · [Backups](runbooks/BACKUPS.md) · [Incidents](runbooks/INCIDENT_RESPONSE.md)
- [AI agent operations](runbooks/AI_AGENT_OPERATIONS.md)

### Security

- [Threat model](security/THREAT_MODEL.md) · [Authentication](security/AUTHENTICATION_MODEL.md) · [Authorization](security/AUTHORIZATION_MODEL.md)
- [Secrets](security/SECRET_MANAGEMENT.md) · [Supply chain](security/SUPPLY_CHAIN_SECURITY.md) · [Review checklist](security/SECURITY_REVIEW_CHECKLIST.md)

### Status

- [Current state](status/CURRENT_STATE.md) · [Game implementation readiness](status/GAME_IMPLEMENTATION_READINESS.md)
- [Bootstrap environment](status/BOOTSTRAP_ENVIRONMENT.md) · [Bootstrap report](status/BOOTSTRAP_REPORT.md)
- [Risks](status/RISKS.md) · [Technical debt](status/TECHNICAL_DEBT.md) · [Open decisions](status/OPEN_DECISIONS.md) · [Deferred work](status/DEFERRED_WORK.md)
