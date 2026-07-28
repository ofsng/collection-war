# Runbook: Local Development

> Audience: anyone setting up Collection War for the first time. Date: 2026-07-28.

---

## Prerequisites

| Tool                        | Version     | Notes                                                     |
| --------------------------- | ----------- | --------------------------------------------------------- |
| **Node.js**                 | **22.16.0** | Pinned in `.nvmrc`. Node 18 is EOL and **will not work**. |
| **pnpm**                    | >= 10.11.0  | `npm install -g pnpm`                                     |
| **Docker** + Compose plugin | any recent  | Required for infrastructure                               |
| Git                         | any recent  |                                                           |

> [!IMPORTANT]
> **Node 22 is mandatory.** `engine-strict=true` makes an install on an older Node fail
> loudly rather than produce a subtly broken tree. If your default is Node 18 — as it was on
> the machine this repository was bootstrapped on — you must run `nvm use` in **every** shell
> before **every** command.

```bash
nvm use          # reads .nvmrc → 22.16.0
node --version   # must print v22.16.0
```

---

## Setup

```bash
git clone <repository>
cd collection-war
nvm use
pnpm install
cp .env.example .env
pnpm infra:up
pnpm db:migrate
pnpm dev
```

That is the whole setup. If any step fails, `pnpm check:env` will usually say why.

### What each step does

**`pnpm install`** — installs 19 workspace projects. Roughly a minute on a warm pnpm store.

**`cp .env.example .env`** — `.env` is git-ignored. Every value in the example is a local
development placeholder and is safe _only_ because every service it points at is a local,
non-networked container.

**`pnpm infra:up`** — starts PostgreSQL, Redis, MinIO and Mailpit, and **waits for every
health check to pass**. A green exit means the services are genuinely ready, not merely
created.

**`pnpm db:migrate`** — applies migrations. At bootstrap there are none yet, and the script
says so rather than failing.

**`pnpm dev`** — starts every application in watch mode.

---

## What runs where

| Service       | URL                        | Notes                                               |
| ------------- | -------------------------- | --------------------------------------------------- |
| Web           | http://localhost:3000      |                                                     |
| Admin         | http://localhost:3001      | Denies all access — no auth exists yet              |
| API           | http://localhost:4000      |                                                     |
| API docs      | http://localhost:4000/docs | Non-production only                                 |
| Expo          | http://localhost:8081      | `pnpm --filter @collection-war/mobile dev`          |
| Mailpit       | http://localhost:8025      | Every outbound email lands here                     |
| MinIO console | http://localhost:9001      | `collection_war_local` / `collection_war_local_dev` |
| PostgreSQL    | `localhost:5432`           | `collection_war` / `collection_war_local_dev`       |
| Redis         | `localhost:6379`           |                                                     |

Every infrastructure port binds to `127.0.0.1`, so nothing is reachable from the network.

---

## Everyday commands

```bash
pnpm dev                # everything, watch mode
pnpm --filter @collection-war/api dev     # just the API
pnpm verify             # the quality gate — run before every commit
pnpm test               # unit tests
pnpm typecheck
pnpm lint
pnpm format
pnpm infra:up | down | logs | status | reset
pnpm check:env          # diagnose a broken setup
pnpm check:docs         # audit docs: links, secrets, scope guards
```

---

## Working on mobile

```bash
pnpm --filter @collection-war/mobile dev
```

> [!WARNING]
> **On an Android emulator, `localhost` is the emulator, not your machine.** Use `10.0.2.2`.
> On a physical device, use your machine's LAN IP and make sure the API binds to `0.0.0.0`
> (it does by default).
>
> ```bash
> EXPO_PUBLIC_API_URL=http://10.0.2.2:4000 pnpm --filter @collection-war/mobile dev
> ```
>
> This costs everyone exactly one hour, once. It is written down so it costs you none.

---

## Troubleshooting

### `ERR_PNPM_UNSUPPORTED_ENGINE`

Wrong Node version. `nvm use`, then retry. This error is intentional — see the note at the
top.

### `pnpm infra:up` says Docker was not found

Docker with the Compose plugin is not installed. The message includes install instructions.
On Debian/Ubuntu/Mint:

```bash
# https://docs.docker.com/engine/install/
sudo usermod -aG docker $USER   # then log out and back in
docker compose version          # must succeed
```

### The API will not start

Read the message — configuration is validated at startup and the error names the exact
problem. Then:

```bash
pnpm check:env
```

### The API starts but `/ready` returns 503

Correct behaviour when a dependency is down. Check which:

```bash
curl -s http://localhost:4000/ready | jq
pnpm infra:status
```

### A port is already in use

```bash
ss -tulpn | grep -E ':(3000|3001|4000|5432|6379)'
```

### Stale build output after switching branches

```bash
pnpm clean && pnpm install && pnpm build
```

### A Turborepo cache result looks wrong

```bash
pnpm turbo run build --force
```

### Metro cannot resolve `@collection-war/...`

pnpm's isolated layout needs Metro configured for it. `apps/mobile/metro.config.js` already
declares `watchFolders` and `nodeModulesPaths`. If it still fails:

```bash
pnpm --filter @collection-war/mobile dev -- --clear
```

**Do not set `node-linker=hoisted` to work around a missing import.** Add the dependency to
the package that uses it.

---

## Resetting

```bash
pnpm infra:down                # stop, keep data
pnpm infra:reset -- --yes      # stop and DESTROY all local data
```

`reset` requires `--yes` because it permanently deletes the local PostgreSQL, Redis and MinIO
volumes. Every local player, migration state and uploaded file is gone.

---

## Known environment limitations

Documented so nobody re-discovers them:

- **Docker was not available on the bootstrap machine.** The compose file has never been
  started, and its health checks are unverified. See
  [bootstrap environment](../status/BOOTSTRAP_ENVIRONMENT.md).
- **The mobile app has never been run on a device or emulator.**
- **Playwright browsers are not installed.** `pnpm test:e2e` needs a one-time
  `pnpm exec playwright install`.
- **Shell output on the bootstrap machine is Turkish.** Project scripts branch on exit codes
  only, never on parsing localized messages.

Related: [Testing](TESTING.md) · [Database](DATABASE.md) · [Migrations](MIGRATIONS.md)
