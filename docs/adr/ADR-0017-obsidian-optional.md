# ADR-0017: Obsidian as an optional documentation interface

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

`docs/` is a large, densely cross-linked set of documents
([ADR-0016](ADR-0016-git-based-documentation.md)). Navigating it in a plain editor means
following links manually with no sense of what points _back_ at the document you are reading.

Obsidian provides backlinks, a graph view and fast local search over exactly this kind of
folder — and it reads plain Markdown from disk with no import step.

## Decision

**`docs/` is written to work as an Obsidian vault, and Obsidian is entirely optional.**

- Obsidian is **not installed** by this project and is **not a dependency** of anything.
- No plugin is required to read anything.
- No Obsidian workspace state is committed — `docs/.obsidian/workspace*`, caches and plugin
  folders are git-ignored.
- **No plugin-specific syntax** in any content that matters.
- **No `[[wikilinks]]` for navigation.** Standard `[text](path.md)` links work in GitHub, in
  VS Code and in Obsidian; wikilinks work only in the last.

Opening the vault is three steps, documented in [`docs/README.md`](../README.md):
install Obsidian → _Open folder as vault_ → select `docs/`.

## Alternatives considered

**Require Obsidian and use its full feature set** — Dataview queries, Templater, plugin-based
indexes. Rejected: it would make the documentation unreadable in GitHub and in any editor,
and it would make a tool choice mandatory for every contributor and every AI agent. The
documentation must be readable by `cat`.

**Prohibit Obsidian.** Rejected: pointless. It reads Markdown from disk; forbidding it
achieves nothing and denies a genuinely useful reading experience.

**Commit a shared Obsidian configuration.** Tempting, so everyone gets the same setup.
Rejected: workspace state is per-machine (window layout, open files, graph position) and
would conflict on every pull. Plugin folders would also become an unreviewed dependency
surface.

**A different knowledge tool (Logseq, Foam, Dendron).** Rejected on the same reasoning —
optional-compatible is the goal, and Obsidian is the most widely used of these.

## Positive consequences

- Backlinks and a graph view for anyone who wants them.
- Fast local search across the whole documentation set.
- **Zero cost to anyone who does not use it** — the documents are unchanged.
- No lock-in: the files are plain Markdown either way.
- AI agents read the same files with no special handling.

## Negative consequences

- Obsidian's most powerful features (Dataview, Templater) cannot be used for content that
  matters.
- Contributors must remember not to insert plugin syntax or wikilinks — a review concern.
- Anyone wanting it must install it themselves.

## Risks

- **Someone commits `.obsidian/` state or introduces wikilinks**, gradually making the
  documentation Obsidian-dependent. Mitigated by `.gitignore` entries and by the rule being
  stated in [documentation rules](../constitution/DOCUMENTATION_RULES.md).
- A future contributor assuming Obsidian is required. Mitigated by this ADR and by the
  README saying so explicitly.

## Review conditions

- A plugin-dependent workflow becomes genuinely valuable → it must remain **additive**;
  the base documents stay plain Markdown.
- Obsidian's Markdown handling diverges from standard in a way that breaks GitHub rendering.
