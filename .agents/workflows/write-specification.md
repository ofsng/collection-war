# Workflow: `/write-specification`

**Purpose:** specify before implementing, so the expensive decisions are made while they are
still cheap.

**Canonical:** [`docs/specifications/README.md`](../../docs/specifications/README.md) ·
[templates](../../docs/specifications/templates/)

## Steps

1. Read the relevant [domain document](../../docs/domains/) — it states the boundary, and is
   deliberately not detailed enough to implement from.
2. Read [product principles](../../docs/product/PRODUCT_PRINCIPLES.md),
   [MVP scope](../../docs/product/MVP_SCOPE.md) and
   [non-goals](../../docs/product/NON_GOALS.md).
3. Pick the template: feature · domain · API · data model · threat model.
4. Write it to `docs/specifications/modules/<domain>/`.
5. Mark it `Draft`. **Only the owner marks anything `Approved`.**

## Must answer

- What problem, for whom
- What is explicitly **out** of scope
- Player-visible behaviour, **including failure and retry**
- Which domain owns the data
- Every decision the server makes, and on what basis
- Data model · API contract · events
- Economy impact — faucet or sink
- Security — who is authorised, what an attacker would try
- Localization and accessibility
- Test strategy
- **Open questions**

## Never

- **Invent game content** — creature names, stats, drop rates, prices, balance numbers. Those
  are design decisions, and an engineer inventing them is how a game ends up with a balance
  nobody chose.
- Mark it `Approved`
- Contradict a non-goal without an explicit decision
- **Decide an open question by omitting it**

## The open-questions section is not a weakness

An unlisted open question becomes an arbitrary decision made by whoever hits it first, at the
least convenient moment, with the least context.

**A specification admitting three open questions is more useful than one that quietly guessed
three times.**
