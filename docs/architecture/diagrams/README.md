# Diagrams

> Every diagram in this repository lives **inside the document it explains**, as a Mermaid
> fenced code block — not as a separate image file.

---

## Why diagrams are text

**They diff.** A change to an architecture diagram shows up in a pull request as readable
lines, not as "binary file changed".

**They cannot drift.** A `.png` exported from a tool nobody has a licence for is a diagram
that will never be updated again, and will therefore eventually lie.

**They render everywhere.** GitHub, Obsidian and most Markdown editors render Mermaid
natively. Where it is not rendered, it degrades to readable text rather than to a broken
image icon.

**Anyone can edit them.** No tool, no account, no export step.

---

## Where the diagrams are

| Diagram                       | Level | Document                                                          |
| ----------------------------- | ----- | ----------------------------------------------------------------- |
| System context                | C4 L1 | [SYSTEM_CONTEXT.md](../SYSTEM_CONTEXT.md)                         |
| Containers                    | C4 L2 | [CONTAINER_ARCHITECTURE.md](../CONTAINER_ARCHITECTURE.md)         |
| API components                | C4 L3 | [COMPONENT_ARCHITECTURE.md](../COMPONENT_ARCHITECTURE.md)         |
| Client components             | C4 L3 | [COMPONENT_ARCHITECTURE.md](../COMPONENT_ARCHITECTURE.md)         |
| Worker lifecycle              | C4 L3 | [COMPONENT_ARCHITECTURE.md](../COMPONENT_ARCHITECTURE.md)         |
| Package dependency layers     | —     | [ARCHITECTURE_OVERVIEW.md](../ARCHITECTURE_OVERVIEW.md)           |
| Trust boundaries              | —     | [SECURITY_ARCHITECTURE.md](../SECURITY_ARCHITECTURE.md)           |
| Outbox sequence               | —     | [EVENT_ARCHITECTURE.md](../EVENT_ARCHITECTURE.md)                 |
| Idempotency sequence          | —     | [API_ARCHITECTURE.md](../API_ARCHITECTURE.md)                     |
| Event-or-direct-call decision | —     | [MODULE_BOUNDARIES.md](../MODULE_BOUNDARIES.md)                   |
| Locale resolution             | —     | [LOCALIZATION_ARCHITECTURE.md](../LOCALIZATION_ARCHITECTURE.md)   |
| Correlation flow              | —     | [OBSERVABILITY_ARCHITECTURE.md](../OBSERVABILITY_ARCHITECTURE.md) |
| Local topology                | —     | [DEPLOYMENT_ARCHITECTURE.md](../DEPLOYMENT_ARCHITECTURE.md)       |
| Proposed hosted topology      | —     | [DEPLOYMENT_ARCHITECTURE.md](../DEPLOYMENT_ARCHITECTURE.md)       |
| Scaling response order        | —     | [SCALING_STRATEGY.md](../SCALING_STRATEGY.md)                     |

---

## Rules

**A diagram must map to something real.** Every box must correspond to a directory, a
process, a table or a service that exists in this repository — or be explicitly labelled as
a proposal, with a date.

A decorative diagram of a system nobody built is worse than no diagram, because it will be
believed and then designed against. The proposed hosted topology is labelled as proposed for
exactly this reason.

**Label what does not exist yet.** Dashed borders, an explicit "NOT IMPLEMENTED", or both.

**Prefer several small diagrams to one large one.** A diagram with forty boxes communicates
that the system is complicated, and nothing else.

**Colours carry meaning consistently** across every diagram here:

| Colour | Meaning                              |
| ------ | ------------------------------------ |
| Blue   | Client / presentation                |
| Green  | Server / trusted                     |
| Amber  | Domain, storage, or a trust boundary |
| Red    | Untrusted, or a failure path         |
| Grey   | Leaf utility, or not implemented     |

---

## This directory

It holds this index and nothing else. If a diagram ever needs to be a standalone file —
because it is referenced from several documents — it belongs here as a `.md` file containing
a Mermaid block, never as an image.
