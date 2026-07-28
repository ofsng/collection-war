# Antigravity Skills

> None defined yet, deliberately.

A skill is worth creating when a procedure is **repeated, multi-step, and error-prone if
improvised**. The [workflows](../workflows/) cover what is repetitive today.

## Candidates, once the project reaches them

| Skill                  | Why it would earn its place                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `create-domain-module` | Scaffolding a module, its package layout, tests and documentation is a long sequence that is easy to do inconsistently       |
| `write-migration`      | Generate → **read the SQL** → apply → verify → confirm the previous version still works. Skipping a step is how data is lost |
| `economy-review`       | The twelve-rule checklist, applied identically every time                                                                    |
| `add-domain-event`     | Event, version, outbox wiring, idempotent consumer, tests                                                                    |

## Constraints

- **Never duplicate a canonical rule** from `docs/` — reference it
  ([ADR-0018](../../docs/adr/ADR-0018-ai-tool-adapter-strategy.md))
- Never skip a verification step to be faster
- Never encode a decision that should be made case by case
