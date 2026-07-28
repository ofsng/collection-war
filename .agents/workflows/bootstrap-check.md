# Workflow: `/bootstrap-check`

**Purpose:** verify the environment before doing anything else. Most wasted effort here comes
from assuming a tool exists that does not.

## Steps

```bash
node --version                                    # must be 22.x — the machine default is 18
pnpm --version                                    # >= 10.11.0
docker compose version || echo "NOT AVAILABLE"
git status --short
pnpm check:env
```

## Report

| Item           | Expected   | Actual |
| -------------- | ---------- | ------ |
| Node           | 22.16.0    |        |
| pnpm           | >= 10.11.0 |        |
| Docker Compose | present    |        |
| `.env`         | present    |        |
| Working tree   | clean      |        |

## Rules

- **Report what you observed**, not what should be true.
- If Node is wrong, say `nvm use` and stop — nothing else will work.
- If Docker is missing, say so plainly. It means `pnpm infra:up`, `pnpm db:migrate` and
  `pnpm test:integration` are unavailable, and **any claim about local infrastructure is
  unverifiable**.
- Never claim a tool is available without running the check.

## Known state

Docker was **not** available on the machine this repository was bootstrapped on. If it is
available now, that is a change worth noting — and
[several documents say otherwise and need updating](../../docs/status/RISKS.md).
