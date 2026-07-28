# Bootstrap Report — CW-0001

> **Date: 2026-07-28.**
> **Outcome: PARTIALLY COMPLETE.** Every gate that could be run passed. Everything requiring
> Docker could not be run and is reported as unverified.
> Environment detail: [BOOTSTRAP_ENVIRONMENT.md](BOOTSTRAP_ENVIRONMENT.md)

---

## Outcome

**Partially complete**, not complete.

The completion standard requires local infrastructure to be configured **and** the API to
demonstrate database and Redis connectivity. Docker was not installed on the machine, so
`docker-compose.yml` has been written and reviewed but **never started**. Consequently no
migration has run, and the six integration tests have never executed.

Everything that did not depend on Docker was built and verified.

---

## Commands executed, and their real results

### Environment detection

```text
$ node --version                → v18.20.8   (default — EOL, unusable)
$ ~/.nvm → available versions   → 18.20.8, 20.19.2, 22.16.0
$ pnpm --version                → 10.11.0
$ docker --version              → command not found
$ docker compose version        → command not found
$ git --version                 → 2.43.0
$ ls -la                        → empty directory
$ git status                    → not a git repository
```

### Repository

```text
$ git init -b main              → initialized, unborn HEAD, no commits
```

The directory was **verifiably empty**, so no existing work could be overwritten. No backup
was required and no file was deleted.

### Install

```text
$ pnpm install                  → FAILED: jsdom@30 requires Node ^22.22.2, have 22.16.0
```

**Resolved** by pinning jsdom to 29.1.1 rather than mutating the developer's global Node
installation.

```text
$ pnpm install                  → 19 workspace projects, 54.3s, exit 0
                                → node_modules 1.3 GB
                                → blocked install scripts: @scarf/scarf, msgpackr-extract
```

Both blocked packages work correctly without their scripts. `@scarf/scarf` is telemetry —
blocking it is a feature. `msgpackr-extract` is optional native acceleration that falls back
to JavaScript.

### Build and test iterations, with the real failures

| Failure                          | Cause                                                                                                 | Fix                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `configuration:build` TS2769     | Zod 4 applies `.default()` **after** a transform, so the default must be the output type              | Default changed to an array                        |
| `configuration` — 6 tests failed | `urlWithScheme('postgres')` did not match `postgresql://`                                             | Accept an explicit list of schemes                 |
| `design-system` — 2 tests failed | RTL auto-cleanup needs a global `afterEach`; every render accumulated                                 | `globals: true` in the Vitest config               |
| `validation` — 1 test failed     | The test's own password was exactly the minimum length, so nothing was rejected                       | Test corrected                                     |
| `testing` — no test files        | `vitest run` exits 1 with no tests                                                                    | Wrote 16 real tests for the fakes                  |
| `web` — 2 tests failed           | **The API client captured `fetch` at construction**, so module-scope clients bypassed every test stub | Resolve `fetch` per request; regression test added |
| `web` — 1 test failed            | `/ready` answers 503 by design, and the client discarded the body                                     | `treatStatusAsSuccess: [503]`                      |
| API startup                      | Swagger UI on Fastify requires `@fastify/static`                                                      | Added, with justification                          |
| `next build`                     | Turbopack could not statically prerender `/_not-found` under a layout reading `cookies()`             | `export const dynamic = 'force-dynamic'`           |
| `pnpm typecheck`                 | `RequestInfo` is a DOM type, absent from the package lib                                              | Use `Parameters<typeof fetch>[0]`                  |

Two of these were **real defects in the platform code**, not test problems: the `fetch`
capture and the readiness-body handling. Both now have regression tests.

### API verified over real HTTP

The built API was started against the local `.env` and probed with `curl`:

```text
GET /health                → 200  {"status":"ok","uptimeSeconds":9.241,"timestamp":"…Z"}
GET /api/v1/system/info    → 200  {"name":"collection-war-api","apiVersion":"v1",
                                   "environment":"local","supportedLocales":["tr-TR","en"]}
GET /ready                 → 503  {"status":"degraded","dependencies":{
                                   "database":{"status":"down",…},
                                   "redis":{"status":"down",…}}}
GET /does-not-exist        → 404  {"error":{"category":"NOT_FOUND",
                                   "code":"RESOURCE_NOT_FOUND",…}}
GET /docs                  → 200
```

Headers observed on a live response:

```text
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; …
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
x-correlation-id: manual-test-1234     ← the supplied id was echoed back
```

> **The 503 is the correct result, not a failure.** Both dependencies were genuinely down —
> Docker was unavailable — and readiness reported it accurately with the right status code.

### Dependency boundaries — proven, not assumed

`eslint-plugin-boundaries` was configured first. A probe revealed it was reporting
**nothing**: in a pnpm workspace every cross-layer import is a package specifier, and the
plugin could not map those back to local elements without an import resolver.

**A boundary rule that silently passes is worse than no rule, because it is trusted.** It was
removed and replaced with `no-restricted-imports` rules per layer, then re-verified:

```text
apps/web        importing @collection-war/database    → ❌ REJECTED
apps/api        importing @collection-war/api-client  → ❌ REJECTED
packages/validation importing @collection-war/domain  → ❌ REJECTED
packages/economy calling Math.random() and Date.now() → ❌ REJECTED (2 errors)
```

All probe files were removed after the test.

### Final verification

```text
$ pnpm verify

  PASS  format:check   3.3s
  PASS  lint           2.1s
  PASS  typecheck      7.2s
  PASS  test           4.6s
  PASS  build          8.1s

✔ verify passed.
```

### Tests: 237 passing across 17 projects

| Project          | Tests |     | Project       |   Tests |
| ---------------- | ----: | --- | ------------- | ------: |
| economy          |    30 |     | api-client    |      17 |
| api              |    28 |     | testing       |      16 |
| localization     |    23 |     | domain        |      15 |
| configuration    |    14 |     | web           |      13 |
| mobile           |    13 |     | workers       |      12 |
| design-system    |    11 |     | observability |      11 |
| database         |     8 |     | validation    |       8 |
| analytics-events |     8 |     | battle-engine |       6 |
| admin            |     4 |     | **Total**     | **237** |

### Not executed

```text
$ pnpm infra:up            → Docker not installed. Fails with an actionable message.
$ pnpm db:migrate          → not run (no database)
$ pnpm test:integration    → not run (gated, exits non-zero without PostgreSQL)
$ pnpm test:e2e            → not run (no Playwright browsers, no tests written)
CI workflows               → never executed (no Git remote)
Mobile on a device         → never run
```

---

## What was built

**405 files**, of which **109 are documentation**.

| Area               | Contents                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Applications**   | api · workers · web · admin · mobile                                                                                                                        |
| **Packages**       | 13, all building and tested                                                                                                                                 |
| **Documentation**  | constitution 6 · product 6 · architecture 16 + diagrams · domains 21 + map + shared kernel · **ADRs 24** · templates 5 · runbooks 9 · security 6 · status 7 |
| **Claude Code**    | `CLAUDE.md` · settings · 12 rules · 10 agents · 3 commands                                                                                                  |
| **Antigravity**    | `agents.md` · rules index · **11 workflows**                                                                                                                |
| **CI**             | 3 workflows · PR template · 2 issue templates                                                                                                               |
| **Infrastructure** | `docker-compose.yml` (PostgreSQL 17, Redis 7, MinIO, Mailpit)                                                                                               |
| **Scripts**        | 6 cross-platform Node scripts                                                                                                                               |

---

## Constraints honoured

| Constraint                               | Held                                                  |
| ---------------------------------------- | ----------------------------------------------------- |
| No gameplay implemented                  | ✅ Two tests actively fail if gameplay symbols appear |
| No paid infrastructure                   | ✅ No account, no resource, **zero cost**             |
| No microservices, no Kubernetes          | ✅ Modular monolith                                   |
| No existing work overwritten             | ✅ The directory was verifiably empty                 |
| Nothing pushed to a remote               | ✅ No remote configured                               |
| No `.cursorrules` / `.cursorignore`      | ✅                                                    |
| Obsidian not installed, not required     | ✅ Optional, no plugins needed                        |
| No duplicated architecture in tool files | ✅ Adapters are pointers                              |
| No unsupported completion claims         | ✅ This report is the evidence                        |

---

## Claims deliberately NOT made

- **Not** that local infrastructure works — it has never been started.
- **Not** that migrations work — none has been generated or applied.
- **Not** that integration tests pass — they have never run.
- **Not** that the mobile app works — it has never rendered a frame.
- **Not** that CI works — it has never executed.
- **Not** that another agent, IDE or product was controlled. Configuration files were
  **written**; no other tool was operated.
- **Not** that any model other than the one running this session was used.

---

## Manual actions required from the user

| #   | Action                                                                    | Why                                                                                       |
| --- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | **`nvm use` in every shell**                                              | The machine default is Node 18 (EOL). `engine-strict` makes an install on it fail loudly. |
| 2   | **Install Docker + Compose, then `pnpm infra:up`**                        | The single largest gap. Converts every infrastructure claim from configured to verified.  |
| 3   | **Confirm or replace the product vision**                                 | It was inferred, not provided, and is marked unapproved. Roughly an hour.                 |
| 4   | Approve or reject [ADR-0023](../adr/ADR-0023-no-real-money-withdrawal.md) | It has legal consequences an engineering bootstrap cannot accept                          |
| 5   | Decide the license                                                        | Currently proprietary by default                                                          |
| 6   | Approve a Git remote before anything is pushed                            | Nothing has been pushed                                                                   |
| 7   | Run the mobile app on a device                                            | It has never run                                                                          |
| 8   | `pnpm exec playwright install` before any E2E work                        | Browsers not downloaded                                                                   |

---

## Recommended next task

**[CW-0002](../tasks/BACKLOG.md) — the canonical architecture and domain specification
package.**

No gameplay implementation begins before it is approved. Items 2 and 3 above are worth doing
first, and neither takes long.

---

Related: [Current state](CURRENT_STATE.md) · [Risks](RISKS.md) ·
[Task packet CW-0001](../tasks/active/CW-0001-development-platform-bootstrap.md)
