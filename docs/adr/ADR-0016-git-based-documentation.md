# ADR-0016: Canonical Git-based documentation

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

This project is developed with substantial AI assistance across more than one tool. That
creates a specific and serious risk: **important decisions living only inside a chat
history**, where they cannot be searched by the next person, cannot be reviewed, and vanish
when the session ends.

Documentation also needs to be reviewable alongside the code it describes, and readable by
both humans and AI agents.

## Decision

**`docs/` in the repository is the canonical source of truth**, in plain Markdown.

- Architecture, decisions, domain designs, runbooks, security models and status all live
  there.
- Documentation changes are reviewed in pull requests, like code.
- Documentation updates land in the **same commit** as the behaviour they describe.
- Diagrams are Mermaid in fenced blocks — text, not images.
- Tool-specific files (`CLAUDE.md`, `agents.md`) are **thin pointers**, never copies.

## Alternatives considered

**A wiki (Confluence, Notion, GitHub Wiki).** Better editing, better search. Rejected: it
drifts from the code immediately because it is not reviewed with the code, it is not
available offline or in an editor, and it cannot be read by tooling in the repository.

**Documentation only in code comments and READMEs.** Always next to the code. Rejected:
there is no natural place for cross-cutting content — architecture, threat models, ADRs —
and no way to describe something that does not exist yet.

**A generated documentation site (Docusaurus, VitePress).** Nicer to read. Rejected as
premature: the source would still be Markdown in this repository, so it can be added later
without changing anything. A build step now buys presentation nobody needs yet.

**A separate documentation repository.** Rejected: it breaks the atomic
code-plus-documentation change, which is the property that keeps documentation true.

## Positive consequences

- **Documentation and code change together**, atomically, and are reviewed together.
- Full history: `git blame` and `git log` work on a decision the same way they work on a
  function.
- Readable in GitHub, any editor, Obsidian, and by AI agents — no export, no account.
- Diffable diagrams.
- No vendor, no subscription, no login.
- Available offline.

## Negative consequences

- Plain Markdown is less pleasant to author than a rich editor.
- No built-in full-text search beyond `grep` and GitHub's search.
- No comment threads on a paragraph.
- Contributors need Git — a real barrier for a non-technical collaborator, and the reason a
  content-authoring interface may be needed later for game content specifically.
- Large documents are harder to navigate than a wiki with a sidebar.

## Risks

- **Documentation rot**, the same risk every approach has. Mitigated by the same-commit rule,
  by review, and by `status/` documents being explicitly dated so staleness is visible rather
  than assumed away.
- Volume: a large documentation set becomes hard to navigate. Mitigated by `docs/README.md`
  being a real index with role-based entry points.

## Review conditions

- Non-technical contributors need to author documentation regularly → consider a CMS for
  _content_, keeping engineering documentation here.
- Search becomes a genuine problem → add a static site with search, sourced from these files.
