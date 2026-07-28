# Generated Documentation

> **Everything in this directory is machine-generated. Never edit it by hand.**

---

## Why the directory exists before its contents

It marks the boundary. Hand-written documentation lives everywhere else in `docs/`;
generated output lives here and only here.

Without that separation, generated files eventually get edited by hand, the edit is lost on
the next generation, and nobody can tell which files are safe to change.

---

## Currently generated

**Nothing.** The API's OpenAPI document is generated at runtime from NestJS decorators and
served at `/docs` outside production — it is not written to disk.

---

## Planned

| Output                  | Source              | Trigger              |
| ----------------------- | ------------------- | -------------------- |
| `openapi.json`          | NestJS decorators   | CI, on API change    |
| API reference           | `openapi.json`      | CI                   |
| Database schema diagram | Drizzle schema      | CI, on schema change |
| Dependency graph        | Workspace manifests | On demand            |

Each of these is worth generating **only once it would be read**. Generating documentation
nobody opens is a build step with no reader.

---

## Rules

1. **Never edit by hand.** The next generation overwrites it.
2. **Never link to a generated file from hand-written documentation** unless it is committed
   — otherwise the link breaks for anyone who has not run the generator.
3. **Decide deliberately whether to commit output.** Committed output is available without
   running anything, at the cost of diff noise on every regeneration. Uncommitted output is
   clean, at the cost of not existing until someone builds it.
4. **The generator belongs in `scripts/`**, and its command belongs in the runbook that
   describes when to run it.
5. **A generated file is not a source of truth.** Its source is.
