# Claude Code Skills

> Skills are packaged procedures Claude Code can invoke by name.

## None defined yet

Deliberately. A skill is worth creating when a procedure is **repeated, multi-step, and
error-prone if improvised**. None of the current workflows meets that bar — the slash
commands in [`../commands/`](../commands/) cover what is repetitive today.

## When to add one

Good candidates, once the project reaches them:

| Skill                  | Why it would earn its place                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `create-domain-module` | Scaffolding a Nest module, its package layout, tests and documentation is a long sequence that is easy to do inconsistently |
| `write-migration`      | Generate → **read the SQL** → apply → verify → check the previous version still works. Skipping a step is how data is lost  |
| `economy-review`       | The twelve-rule checklist, applied identically every time                                                                   |
| `add-domain-event`     | Event, version, outbox wiring, idempotent consumer, tests                                                                   |

## What a skill must not do

- Duplicate a canonical rule from `docs/` — reference it
- Skip a verification step to be faster
- Encode a decision that should be made case by case

See [ADR-0018](../../docs/adr/ADR-0018-ai-tool-adapter-strategy.md).
