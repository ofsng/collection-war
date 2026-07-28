# Architecture Decision Records

> Audience: anyone asking "why is it like this?" — or about to change something and wondering
> what it was protecting.

An ADR records **one decision**, the context that forced it, the alternatives that were
genuinely considered, and the consequences accepted.

---

## The rule that makes ADRs useful

**An accepted ADR is immutable.**

It is a record of what was decided, by whom, with what information, at a point in time. If
the decision changes, write a **new** ADR that supersedes the old one and mark the old one
`Superseded by ADR-NNNN`. Never edit an accepted ADR to say something different.

This is the difference between a decision log and a wiki. A wiki tells you what someone
currently believes. A decision log tells you why the code looks the way it does — which is
the question you actually have when you are about to change it.

---

## Statuses

| Status       | Meaning                                                           |
| ------------ | ----------------------------------------------------------------- |
| `Proposed`   | Decided provisionally. Not yet approved, or genuinely still open. |
| `Accepted`   | Decided and in force. Immutable.                                  |
| `Superseded` | Replaced. Names its replacement.                                  |
| `Deprecated` | No longer applies; nothing replaced it.                           |

> **Do not mark an ADR `Accepted` to make it look finished.** Several ADRs below are
> `Proposed` because they genuinely need owner approval. Recording that honestly is the
> point of the status field.

---

## The register

| #                                                  | Decision                                        | Status       |
| -------------------------------------------------- | ----------------------------------------------- | ------------ |
| [0001](ADR-0001-typescript-as-primary-language.md) | TypeScript as the primary language              | Accepted     |
| [0002](ADR-0002-monorepo.md)                       | Monorepo                                        | Accepted     |
| [0003](ADR-0003-pnpm-workspaces.md)                | pnpm workspaces                                 | Accepted     |
| [0004](ADR-0004-turborepo.md)                      | Turborepo as the task runner                    | Accepted     |
| [0005](ADR-0005-modular-monolith.md)               | Modular monolith, not microservices             | Accepted     |
| [0006](ADR-0006-nextjs-for-web.md)                 | Next.js for web and admin                       | Accepted     |
| [0007](ADR-0007-expo-react-native-mobile.md)       | Expo and React Native for mobile                | Accepted     |
| [0008](ADR-0008-nestjs-fastify-api.md)             | NestJS on Fastify for the API                   | Accepted     |
| [0009](ADR-0009-postgresql-source-of-truth.md)     | PostgreSQL as the single source of truth        | Accepted     |
| [0010](ADR-0010-drizzle-orm.md)                    | Drizzle ORM as the typed database layer         | Accepted     |
| [0011](ADR-0011-redis-bullmq.md)                   | Redis and BullMQ for cache and queues           | Accepted     |
| [0012](ADR-0012-s3-compatible-storage.md)          | S3-compatible object storage                    | Accepted     |
| [0013](ADR-0013-docker-compose-local-infra.md)     | Docker Compose for local infrastructure         | Accepted     |
| [0014](ADR-0014-shared-domain-packages.md)         | Framework-independent shared domain packages    | Accepted     |
| [0015](ADR-0015-deterministic-battle-engine.md)    | A deterministic battle-engine package           | Accepted     |
| [0016](ADR-0016-git-based-documentation.md)        | Canonical Git-based documentation               | Accepted     |
| [0017](ADR-0017-obsidian-optional.md)              | Obsidian as an optional documentation interface | Accepted     |
| [0018](ADR-0018-ai-tool-adapter-strategy.md)       | Thin AI tool adapters over canonical docs       | Accepted     |
| [0019](ADR-0019-cloud-neutral-architecture.md)     | Cloud-neutral initial architecture              | Accepted     |
| [0020](ADR-0020-transactional-outbox.md)           | Transactional outbox from day one               | Accepted     |
| [0021](ADR-0021-centralized-localization.md)       | Centralized localization, Turkish-first         | Accepted     |
| [0022](ADR-0022-ledger-first-economy.md)           | Ledger-first economy architecture               | Accepted     |
| [0023](ADR-0023-no-real-money-withdrawal.md)       | No real-money withdrawal at initial release     | **Proposed** |
| [0024](ADR-0024-server-authoritative-state.md)     | Server-authoritative game state                 | Accepted     |

---

## Template

```markdown
# ADR-NNNN: <Title>

- **Status:** Proposed | Accepted | Superseded by ADR-NNNN | Deprecated
- **Date:** YYYY-MM-DD
- **Deciders:** <who>

## Context

What forced a decision. The constraints, the pressures, what was true at the time.

## Decision

What was decided. Specific and unambiguous.

## Alternatives considered

Each real alternative, and the actual reason it lost. "We didn't like it" is not a reason.
An alternative nobody seriously considered does not belong here.

## Positive consequences

What this buys.

## Negative consequences

What this costs. **Be honest.** An ADR with no costs was not a real decision.

## Risks

What could make this wrong later.

## Review conditions

The specific, observable trigger that should make someone revisit this.
```

---

## Writing a good one

**Alternatives are the most valuable section.** The decision itself is usually visible in the
code. The alternatives are not, and without them the next person re-litigates a choice that
was already made carefully.

**Be honest about costs.** An ADR listing only benefits reads as marketing and will be
distrusted, including the parts that are true.

**Review conditions should be observable.** "Revisit if it becomes a problem" is not a review
condition. "Revisit if a single worker cannot keep outbox lag under 10 seconds" is.

**One decision per ADR.** Bundled decisions cannot be superseded independently.
