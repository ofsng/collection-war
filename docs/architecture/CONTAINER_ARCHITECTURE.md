# Container Architecture (C4 Level 2)

> Audience: anyone deploying, debugging or adding a runtime component. Date: 2026-07-28.
> Every container below corresponds to something in this repository.

---

```mermaid
flowchart TB
    player(["Player"])
    admin(["Administrator"])

    subgraph clients["Client applications"]
        web["<b>Web</b><br/>apps/web<br/>Next.js 16 · React 19<br/><i>:3000</i>"]
        mobile["<b>Mobile</b><br/>apps/mobile<br/>Expo 57 · RN 0.86<br/><i>iOS · Android</i>"]
        adminapp["<b>Admin</b><br/>apps/admin<br/>Next.js 16<br/><i>:3001</i>"]
    end

    subgraph server["Server processes"]
        api["<b>API</b><br/>apps/api<br/>NestJS 11 · Fastify 5<br/><i>:4000</i><br/>THE ONLY AUTHORITY"]
        workers["<b>Workers</b><br/>apps/workers<br/>BullMQ 5<br/><i>no HTTP surface</i>"]
    end

    subgraph data["Stateful infrastructure"]
        pg[("<b>PostgreSQL 17</b><br/><i>:5432</i><br/>SOURCE OF TRUTH")]
        redis[("<b>Redis 7</b><br/><i>:6379</i><br/>cache + queue only")]
        minio[("<b>MinIO</b><br/><i>:9000</i><br/>S3-compatible")]
        mailpit[("<b>Mailpit</b><br/><i>:1025 / :8025</i><br/>local mail capture")]
    end

    player --> web & mobile
    admin --> adminapp

    web -->|HTTPS/JSON| api
    mobile -->|HTTPS/JSON| api
    adminapp -->|HTTPS/JSON| api

    api -->|SQL, pooled| pg
    api -->|cache, rate limit| redis
    api -->|presigned URLs| minio
    api -->|SMTP| mailpit

    workers -->|SQL| pg
    workers -->|consume jobs| redis

    api -.->|"outbox row<br/>(same transaction)"| pg
    pg -.->|relay polls| workers

    classDef client fill:#1f3a5f,stroke:#4c8dff,color:#e8ecf1
    classDef srv fill:#2d4a3e,stroke:#3fb950,color:#e8ecf1
    classDef store fill:#4a3520,stroke:#d29922,color:#e8ecf1
    classDef person fill:#3a2b4a,stroke:#a371f7,color:#e8ecf1
    class web,mobile,adminapp client
    class api,workers srv
    class pg,redis,minio,mailpit store
    class player,admin person
```

---

## Server containers

### API — `apps/api`

The only process permitted to make a business decision.

|                 |                                                                                         |
| --------------- | --------------------------------------------------------------------------------------- |
| Runtime         | Node 22, NestJS 11 on Fastify 5                                                         |
| Port            | 4000                                                                                    |
| State           | **Stateless.** Scales horizontally without coordination.                                |
| Depends on      | PostgreSQL (required) · Redis (required) · S3 (later) · SMTP (later)                    |
| Endpoints today | `GET /health` · `GET /ready` · `GET /api/v1/system/info` · `GET /docs` (non-production) |

Startup order is deliberate: configuration is validated _first_, so an invalid environment
kills the process before it binds a port; security headers are registered before any route
exists; shutdown hooks are enabled before listening.

**Verified running** during the bootstrap — see [bootstrap report](../status/BOOTSTRAP_REPORT.md).

### Workers — `apps/workers`

|                       |                                                              |
| --------------------- | ------------------------------------------------------------ |
| Runtime               | Node 22, BullMQ 5                                            |
| Port                  | none — no HTTP surface, and therefore no HTTP attack surface |
| State                 | Stateless; work lives in Redis and PostgreSQL                |
| Registered processors | **Zero.** Lifecycle only, by design.                         |

Separate from the API because a long job must not compete with request handling for the
event loop, because the two scale on different signals, and because a crashing job must not
take down request serving.

Planned queues (declared, not served): `outbox-relay` · `notifications` · `scheduled` ·
`analytics` · `maintenance`.

---

## Client containers

|           | Web                                                            | Mobile                            | Admin                                                              |
| --------- | -------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Framework | Next.js 16 App Router                                          | Expo 57 / RN 0.86                 | Next.js 16                                                         |
| Rendering | Server-rendered per request                                    | Native                            | Server-rendered per request                                        |
| Locale    | Cookie + `Accept-Language`, resolved server-side               | SecureStore + device locale       | Session preference                                                 |
| Storage   | Cookie (preference only)                                       | SecureStore (Keychain / Keystore) | Cookie                                                             |
| Hardening | `nosniff`, `DENY` framing, referrer policy, permissions policy | Platform sandbox                  | The above **plus** `frame-ancestors 'none'`, `no-store`, `noindex` |

The admin application is hardened further because it is the higher-value target: an admin
session can move currency.

---

## Stateful infrastructure

### PostgreSQL 17 — the source of truth

Everything durable. Initialised with `--locale=C` so ordering is deterministic and does not
depend on the host locale — which matters here, since the bootstrap machine runs `tr_TR` and
Turkish casing rules differ from C.

Tables today: `outbox`, `idempotency_keys`. Both are platform infrastructure. No game schema
exists yet, deliberately.

### Redis 7 — cache and queue, never truth

Job queue, cache, rate-limit counters, ephemeral state. Configured with `appendonly yes` so
queued jobs survive a restart, and `maxmemory-policy noeviction` so a full Redis fails loudly
instead of silently discarding jobs.

**A Redis restart must be an availability event, never a data-loss event.** If losing Redis
would lose something a player owns, that thing is in the wrong place.

### MinIO — S3-compatible storage

Local stand-in for any S3 API. Keeps the application cloud-neutral: the same calls work
against AWS S3, Cloudflare R2 or Backblaze B2. See
[ADR-0012](../adr/ADR-0012-s3-compatible-storage.md).

### Mailpit — local mail capture

Captures every outbound email locally. Nothing leaves the machine.

---

## Local port map

| Port        | Service             | Notes                                     |
| ----------- | ------------------- | ----------------------------------------- |
| 3000        | Web                 |                                           |
| 3001        | Admin               |                                           |
| 4000        | API                 | `/docs` serves OpenAPI outside production |
| 5432        | PostgreSQL          | bound to `127.0.0.1` only                 |
| 6379        | Redis               | bound to `127.0.0.1` only                 |
| 8025        | Mailpit UI          |                                           |
| 8081        | Expo dev server     |                                           |
| 9000 / 9001 | MinIO API / console |                                           |

Every infrastructure port binds to `127.0.0.1`, so nothing is reachable from the network —
including from another machine on the same café Wi-Fi.

---

## What does not exist

No load balancer, no reverse proxy, no CDN, no message broker, no search cluster, no metrics
stack, no container orchestrator. None is needed at zero traffic, and each would be a cost
and a maintenance burden. See [cost strategy](COST_STRATEGY.md).

Related: [Component architecture](COMPONENT_ARCHITECTURE.md) ·
[Deployment architecture](DEPLOYMENT_ARCHITECTURE.md) ·
[Local development](../runbooks/LOCAL_DEVELOPMENT.md)
