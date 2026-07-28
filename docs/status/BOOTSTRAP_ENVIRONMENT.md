# Bootstrap Environment Report

> Status: **Verified by direct command execution**
> Date: 2026-07-28
> Related: [BOOTSTRAP_REPORT.md](BOOTSTRAP_REPORT.md) · [CURRENT_STATE.md](CURRENT_STATE.md) · [Local Development runbook](../runbooks/LOCAL_DEVELOPMENT.md)

This document records the execution environment detected at the moment the Collection War
development platform was bootstrapped. Every entry below was produced by running a command and
reading its output. Nothing here is inferred or assumed.

---

## 1. Detected execution environment

| Property          | Value                                                                          |
| ----------------- | ------------------------------------------------------------------------------ |
| Agent runtime     | **Claude Code** (Anthropic CLI / agent harness), model `claude-opus-5`         |
| Filesystem access | Yes — full read/write in the primary working directory                         |
| Shell access      | Yes — `bash`                                                                   |
| Network access    | Yes — npm registry reachable (`HTTP/2 200` from `registry.npmjs.org`)          |
| Interactive TTY   | No — interactive prompts (`git rebase -i`, `expo login`, etc.) are unavailable |

### What this environment is _not_

The following statements are explicitly **not** claimed, because they were not observed:

- No other IDE or agent product (Google Antigravity, Claude Cowork, Cursor) was launched, controlled,
  or configured from inside this session. This bootstrap **writes configuration files** that those
  tools can read; it does not operate them.
- No model other than the one running this session was invoked.
- Obsidian was **not** installed. `docs/` is written to be Obsidian-compatible; opening it is a
  manual, optional user action.
- No cloud account, hosted database, domain, or paid resource was created.

---

## 2. Operating system

```text
Linux ofsng-Victus-by-HP-Gaming-Laptop-16-s0xxx 6.8.0-59-generic #61-Ubuntu SMP
PREEMPT_DYNAMIC Fri Apr 11 23:16:11 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux
```

| Property        | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| Distribution    | Linux Mint 22 "Wilma" (`ID_LIKE="ubuntu debian"`)          |
| Kernel          | 6.8.0-59-generic                                           |
| Architecture    | x86_64                                                     |
| Shell           | bash                                                       |
| System locale   | Turkish (`tr_TR`) — shell error messages appear in Turkish |
| Free disk space | 152 GB available on `/` (458 GB total, 66% used)           |

> **Note on locale:** the system shell emits Turkish-language error text. Automation that parses
> shell output by string matching will break. All project scripts therefore rely on **exit codes**,
> never on parsing localized shell messages. See [`scripts/`](../../scripts).

---

## 3. Working directory and Git state

| Property                        | Value                                                               |
| ------------------------------- | ------------------------------------------------------------------- |
| Primary working directory       | `/home/ofsng/Projects/collection-war`                               |
| State before bootstrap          | **Empty** — `ls -la` returned only `.` and `..`                     |
| Git repository before bootstrap | **No** — `fatal: not a git repository`                              |
| Git repository after bootstrap  | **Yes** — initialized with `git init -b main`                       |
| Commits at time of writing      | None (unborn `HEAD`)                                                |
| Uncommitted work at risk        | **None** — the directory was empty, so nothing could be overwritten |
| Configured Git identity         | `ofsng` / `omersengulisting@gmail.com`                              |
| Configured Git remote           | **None** — nothing has been or will be pushed                       |

Because the directory was verifiably empty, the "do not overwrite meaningful existing work"
constraint was satisfied trivially. No backup was required and no file was deleted.

---

## 4. Toolchain availability

### Node.js — available, but the default version is too old

| Property                    | Value                                   |
| --------------------------- | --------------------------------------- |
| Version manager             | `nvm` at `~/.nvm`                       |
| **Default / active `node`** | **v18.20.8** ← too old for this project |
| Installed versions          | v18.20.8, **v20.19.2**, **v22.16.0**    |
| `npm` (on v18)              | 10.8.2                                  |
| `npm` (on v22)              | 10.9.2                                  |
| Other managers              | `fnm`, `volta` not installed            |

> [!IMPORTANT]
> **Node 18 reached end-of-life and is below this project's floor.** Next.js 16, NestJS 11 and the
> current Vite/Vitest line all require Node >= 20.19. The repository pins **Node 22.16.0** via
> [`.nvmrc`](../../.nvmrc) and enforces it via `engines` + `engine-strict=true` in
> [`.npmrc`](../../.npmrc), so an accidental `pnpm install` on Node 18 fails loudly instead of
> producing a subtly broken tree.
>
> **Every command in this repository must be run after `nvm use`.** This is a manual user action —
> see [Manual actions required](BOOTSTRAP_REPORT.md#manual-actions-required-from-the-user).

### pnpm — available

| Property   | Value                                                       |
| ---------- | ----------------------------------------------------------- |
| Version    | **10.11.0**                                                 |
| Store path | `/home/ofsng/.local/share/pnpm/store/v10`                   |
| Corepack   | 0.32.0 (present, not required — pnpm is installed globally) |

### Docker — NOT AVAILABLE

```text
$ docker --version
/bin/bash: line 1: docker: command not found

$ docker compose version
/bin/bash: line 1: docker: command not found
```

| Property         | Value                               |
| ---------------- | ----------------------------------- |
| `docker`         | **Not installed**                   |
| `docker compose` | **Not installed** (no CLI to query) |
| `podman`         | **Not installed**                   |

> [!WARNING]
> **This is the single largest limitation of the current environment.**
> Local infrastructure (PostgreSQL, Redis, MinIO, Mailpit) is **fully configured** in
> [`docker-compose.yml`](../../docker-compose.yml) but **could not be started or health-checked**
> during this bootstrap. Consequently:
>
> - `pnpm infra:up` was **not** executed successfully — it fails with a clear, actionable error.
> - PostgreSQL / Redis / MinIO / Mailpit health was **not** verified.
> - The API's _live_ database and Redis connectivity was **not** verified against real services.
>   The API's readiness probe and its dependency-check code paths are covered by unit tests with
>   injected fakes, which is a weaker guarantee and is recorded as such.
>
> This is why the bootstrap is reported as **partially complete**. See
> [RISKS.md](RISKS.md) and [DEFERRED_WORK.md](DEFERRED_WORK.md).

### Other tools

| Tool                | Status                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| `git`               | 2.43.0 — available                                                            |
| `python3`           | 3.12.3 — available (not used by this project)                                 |
| `chromedriver`      | present in `/usr/local/bin` (not used; Playwright manages its own browsers)   |
| Playwright browsers | **Not downloaded** — `pnpm test:e2e` requires a one-time `playwright install` |

---

## 5. Permissions available

| Capability                                              | Available                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| Read/write inside `/home/ofsng/Projects/collection-war` | Yes                                                           |
| Read elsewhere in `$HOME`                               | Yes                                                           |
| Create files, directories                               | Yes                                                           |
| Run arbitrary local commands                            | Yes                                                           |
| Reach the public internet / npm registry                | Yes                                                           |
| Install system packages (`apt`)                         | Not attempted — requires `sudo`, out of scope for a bootstrap |
| Start container runtimes                                | **No** — no runtime installed                                 |
| Push to a Git remote                                    | **Not attempted** — prohibited without explicit user approval |
| Create cloud/paid resources                             | **Not attempted** — prohibited by scope                       |

---

## 6. Summary of environment-imposed limitations

| #   | Limitation                         | Impact                                                                                                       | Mitigation                                                                                                                                                                   |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Docker absent                      | Local infra cannot run; DB/Redis/MinIO/Mailpit health unverified; no integration tests against real services | Compose file + runbooks written and reviewed; `pnpm infra:up` fails with an explicit install-Docker message; integration tests are written but gated on service availability |
| 2   | Default Node is v18 (EOL)          | `pnpm install` on a fresh shell would fail                                                                   | `.nvmrc` pins 22.16.0; `engine-strict` turns a silent failure into a loud one; documented in the runbook                                                                     |
| 3   | No interactive TTY                 | Expo/EAS login, interactive Git, and interactive scaffolders unusable                                        | Mobile app scaffolded by hand rather than via `create-expo-app`; validated by `typecheck` + `lint` + unit test rather than by a device build                                 |
| 4   | Turkish system locale              | Shell output strings are localized                                                                           | Scripts branch on exit codes only                                                                                                                                            |
| 5   | Playwright browsers not installed  | `pnpm test:e2e` cannot run yet                                                                               | E2E harness configured; browser download documented as a manual opt-in step                                                                                                  |
| 6   | No physical/emulated mobile device | Mobile shell cannot be run on a device or simulator                                                          | Mobile verified via typecheck, lint and unit tests only — explicitly **not** claimed as "runs on device"                                                                     |

---

## 7. Version baseline selected

Versions were resolved live from the npm registry on 2026-07-28 and pinned in `package.json` files.

| Concern              | Selection                                                        | Note                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Language             | TypeScript **5.9.3**                                             | TypeScript 7.x exists but the lint/build ecosystem is not yet aligned — see [ADR-0001](../adr/ADR-0001-typescript-as-primary-language.md) |
| Monorepo task runner | Turborepo **2.10.7**                                             |                                                                                                                                           |
| Package manager      | pnpm **10.11.0**                                                 | matches the locally installed version                                                                                                     |
| Web / Admin          | Next.js **16.2.12**, React **19.2.8**                            |                                                                                                                                           |
| Mobile               | Expo **57.0.8**, React Native **0.86.2**                         |                                                                                                                                           |
| API                  | NestJS **11.1.28** + Fastify **5.10.0**                          |                                                                                                                                           |
| Database             | Drizzle ORM **0.45.2**, drizzle-kit **0.31.10**, `pg` **8.22.0** |                                                                                                                                           |
| Cache / Queue        | ioredis **5.11.1**, BullMQ **5.81.2**                            |                                                                                                                                           |
| Validation           | Zod **4.4.3**                                                    |                                                                                                                                           |
| Logging              | Pino **10.3.1**                                                  |                                                                                                                                           |
| Lint                 | ESLint **9.39.5** + typescript-eslint **8.65.0**                 | ESLint 10 exists; 9.x chosen for plugin-ecosystem stability                                                                               |
| Format               | Prettier **3.9.6**                                               |                                                                                                                                           |
| Test                 | Vitest **4.1.10**, Playwright **1.62.0**                         |                                                                                                                                           |

---

## 8. Reproducing this report

```bash
node --version && pnpm --version && git --version
docker --version || echo "docker: NOT AVAILABLE"
docker compose version || echo "docker compose: NOT AVAILABLE"
uname -a && cat /etc/os-release
```

---

Next: [BOOTSTRAP_REPORT.md](BOOTSTRAP_REPORT.md) — what was built and which verification gates passed.
