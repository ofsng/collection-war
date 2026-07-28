# Specifications

> Audience: anyone about to build something. Date: 2026-07-28.

A specification is written **before** implementation, reviewed, and then implemented. Not
written afterwards to describe what was built — that is documentation, and it is a different
thing with a different purpose.

---

## Why specify first

Every rule in this project that is expensive to add later — transactional integrity,
idempotency, audit trails, determinism, localization completeness — is cheap to design in and
costly to retrofit.

A specification is where those get decided while they are still cheap. It is also where
somebody other than the implementer gets to disagree, which is the only reliable way to catch
a design that is wrong rather than merely buggy.

The [domain documents](../domains/) describe **boundaries and intentions**. They are
deliberately not detailed enough to implement from. Treating them as if they were is how a
design becomes whatever the first implementation happened to do.

---

## When a specification is required

| Change                                              | Specification required?                                      |
| --------------------------------------------------- | ------------------------------------------------------------ |
| A new domain module                                 | **Yes** — domain spec + data model + API spec + threat model |
| A feature touching currency, inventory or ownership | **Yes**, including a threat model                            |
| A new API endpoint                                  | **Yes** — API spec, at minimum                               |
| A new database table                                | **Yes** — data model                                         |
| A cross-platform contract change                    | **Yes**                                                      |
| A new UI screen for an existing feature             | Usually not                                                  |
| A bug fix                                           | No                                                           |
| A refactor with no behaviour change                 | No                                                           |

When in doubt: if getting it wrong would require a migration, a rollback or an apology,
specify it.

---

## Templates

| Template                                           | Use for                                  |
| -------------------------------------------------- | ---------------------------------------- |
| [Feature spec](templates/FEATURE_SPEC_TEMPLATE.md) | A player-visible capability              |
| [Domain spec](templates/DOMAIN_SPEC_TEMPLATE.md)   | A new bounded context                    |
| [API spec](templates/API_SPEC_TEMPLATE.md)         | Endpoints and their contracts            |
| [Data model](templates/DATA_MODEL_TEMPLATE.md)     | Tables, indexes, constraints, migrations |
| [Threat model](templates/THREAT_MODEL_TEMPLATE.md) | Security analysis of a feature or domain |

Use them. They exist so that a specification written under time pressure still contains the
parts that turn out to matter.

---

## Where specifications live

```text
docs/specifications/modules/<domain>/
├── DOMAIN_SPEC.md
├── DATA_MODEL.md
├── API_SPEC.md
└── THREAT_MODEL.md
```

`modules/` is empty. **No domain has been specified yet**, which is the accurate state of the
project — see [CW-0002](../tasks/BACKLOG.md).

---

## Lifecycle

```mermaid
flowchart LR
    draft["Draft"] --> review["In review"]
    review -->|changes requested| draft
    review --> approved["Approved"]
    approved --> impl["Implemented"]
    impl --> superseded["Superseded"]

    classDef d fill:#2b323c,stroke:#6e7781,color:#e8ecf1
    classDef a fill:#1f3a2f,stroke:#3fb950,color:#e8ecf1
    class draft,review,superseded d
    class approved,impl a
```

**Implementation does not begin before `Approved`.** That is the entire value of the process;
skipping it turns the specification into after-the-fact documentation.

If implementation reveals that the specification is wrong — which happens, and is useful —
**update the specification, get it re-approved, then continue**. Do not let the code and the
specification diverge silently; a specification nobody trusts is worse than none, because it
still gets read.

---

## Review checklist

Any specification should be answerable on all of these before approval:

- [ ] What problem does this solve, and for whom?
- [ ] What is explicitly **out** of scope?
- [ ] Which domain owns the data?
- [ ] Does it cross a module boundary? How?
- [ ] Does it change currency, inventory or ownership? If so, has the
      [economy checklist](../constitution/ECONOMY_INTEGRITY_RULES.md#reviewer-checklist) been
      applied?
- [ ] Is every state change transactional?
- [ ] Does every mutation require an idempotency key?
- [ ] Is authorization specified per operation?
- [ ] What does an attacker want here, and what stops them?
- [ ] Are all user-facing strings keys, in both locales?
- [ ] What is tested, and how?
- [ ] What is the failure behaviour?
- [ ] What is the migration path, and can it be rolled back?

Related: [Task packets](../tasks/README.md) · [Domain map](../domains/DOMAIN_MAP.md) ·
[Documentation rules](../constitution/DOCUMENTATION_RULES.md)
