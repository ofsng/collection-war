# Domains

> **No domain in this directory is implemented.** These are designs, written before code, so
> that the first implementation has a boundary to respect. Date: 2026-07-28.

Start with the [domain map](DOMAIN_MAP.md) for the decomposition and the reasoning behind
it, and the [shared kernel](SHARED_KERNEL.md) for what every domain may share.

---

## Index

### Identity and player

- [identity](identity/) — accounts, authentication, sessions
- [player-profile](player-profile/) — the in-game persona

### Creatures

- [creature-catalog](creature-catalog/) — species definitions (authored content)
- [owned-creatures](owned-creatures/) — instances a player owns
- [progression](progression/) — levels, evolution, star development

### Items

- [inventory](inventory/) — materials and consumables
- [crafting](crafting/) — converting materials into items

### Combat

- [battle](battle/) — teams and deterministic resolution
- [pve](pve/) — campaign content
- [arena](arena/) — asynchronous player-versus-player

### World

- [exploration](exploration/) — timed expeditions
- [habitats](habitats/) — passive production

### Collection

- [collection](collection/) — catalogue completion and exhibitions

### Economy

- [marketplace](marketplace/) — player-to-player trading with escrow
- [economy](economy/) — ledgers, wallets, rewards

### Engagement

- [quests](quests/) — objectives and claims
- [notifications](notifications/) — delivery across channels
- [social](social/) — friends and social features

### Operations

- [administration](administration/) — admin, moderation, feature flags, content
- [audit](audit/) — the immutable record of who did what
- [analytics](analytics/) — product measurement

---

## Integrity tiers

How much process a change requires. See [domain map](DOMAIN_MAP.md#integrity-tiers).

| Tier               | Domains                                                               | A change requires                                                                                                |
| ------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **1 — Critical**   | economy · marketplace · identity · audit · owned-creatures            | Transactions · idempotency · audit · invariants · exhaustive tests · security review · ADR for structural change |
| **2 — Core**       | battle · inventory · progression · crafting · quests · administration | Transactions where state changes · thorough tests · review                                                       |
| **3 — Supporting** | everything else                                                       | Ordinary care                                                                                                    |

---

## Document structure

Every domain document answers the same eleven questions. Consistency matters here: a reader
looking for "what must this never do" should find it in the same place every time.

1. Purpose · 2. Responsibilities · 3. Owned data · 4. Public interface ·
2. Incoming dependencies · 6. Outgoing dependencies · 7. Domain events ·
3. Security concerns · 9. Economy concerns · 10. Expected scaling pressure ·
4. **What this domain must never do**

Use [`DOMAIN_SPEC_TEMPLATE.md`](../specifications/templates/DOMAIN_SPEC_TEMPLATE.md) when
turning one of these designs into an implementable specification.

---

## Before implementing any of these

The next phase is to write and approve the full specification package — data models,
API contracts, events, authorization matrix, threat model, test strategy — **before** any
gameplay code is written. See [CW-0002](../tasks/BACKLOG.md).

That sequencing is deliberate. These documents are boundaries and intentions; they are not
detailed enough to implement from, and treating them as if they were is how a design becomes
whatever the first implementation happened to do.
