# Workflow: `/architecture-review`

**Purpose:** review a structural change before it becomes load-bearing.

**Canonical:** [Architecture principles](../../docs/constitution/ARCHITECTURE_PRINCIPLES.md) ·
[Dependency rules](../../docs/architecture/DEPENDENCY_RULES.md) ·
[Module boundaries](../../docs/architecture/MODULE_BOUNDARIES.md)

## Use when

A change adds a package or module · changes data ownership · crosses a module boundary ·
adds infrastructure · changes a transaction boundary · changes a cross-platform contract.

## Checklist

- [ ] Respects the layer rule: `apps → adapters → domain → leaf`
- [ ] Adds no dependency the matrix forbids
- [ ] Domain packages stay framework-, transport- and storage-free
- [ ] **No cross-module database join** (reject one outright)
- [ ] No module writes another module's tables
- [ ] Event-versus-direct-call is the right choice — see the
      [decision procedure](../../docs/architecture/MODULE_BOUNDARIES.md#event-or-direct-call-a-decision-procedure)
- [ ] Transaction boundaries are not split across systems
- [ ] Side effects go through the outbox, never inline
- [ ] No new infrastructure without an ADR
- [ ] Would survive the
      [extraction test](../../docs/architecture/MODULE_BOUNDARIES.md#the-extraction-test)
- [ ] Diagrams map to things that exist

## Ask

1. **What does this cost us in two years?**
2. Is there a cheaper design meeting the same need?
3. What breaks if this module needs to be extracted later?
4. Is this solving a measured problem or an anticipated one?

Question 4 catches most over-engineering.

## Output

**Approve** or **reject**, with specifics.

If a real decision was made, write an ADR — with the alternatives that were genuinely
considered and **why each lost**. Mark it `Proposed` if it needs owner approval; do not mark
it `Accepted` to look finished.

## Escalate

A decision that changes what the product is · a cost implication · a legal question · two
existing ADRs in conflict.
