# Rule: Architecture

**Canonical:** [ARCHITECTURE_PRINCIPLES.md](../../docs/constitution/ARCHITECTURE_PRINCIPLES.md) ·
[ARCHITECTURE_OVERVIEW.md](../../docs/architecture/ARCHITECTURE_OVERVIEW.md) ·
[DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md) ·
[MODULE_BOUNDARIES.md](../../docs/architecture/MODULE_BOUNDARIES.md)

---

## In one line

**Modular monolith. Dependencies point inward. One database. Server decides everything.**

## Before changing structure

Read the canonical documents above. Then check:

- Does this respect the layer rule? `apps → adapters → domain → leaf`
- Does it add a dependency the matrix forbids?
- Does it cross a module boundary? How — direct call, or event?
- Does it need an ADR?

## Never

- Import storage or a server framework from a client application
- Import the API client or React from a server application
- Import any framework from `domain`, `battle-engine` or `economy`
- Import an inner layer from a leaf package
- Join across module tables
- Add infrastructure without an ADR

These are lint-enforced and were verified against deliberate violations. If lint rejects an
import, the design is wrong — **do not add an exception**.

## Escalate

Schema decisions spanning domains · trust boundary changes · new infrastructure ·
cross-platform contract changes · monolith boundary violations · irreversible migrations ·
conflicting ADRs.

## Write an ADR when

You chose between real alternatives with lasting consequences. Template:
[adr/README.md](../../docs/adr/README.md#template).

Mark it `Proposed` if it genuinely needs approval. **Do not mark it `Accepted` to look
finished.**
