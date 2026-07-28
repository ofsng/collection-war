# Engineering Principles

> **Binding.** Contradicting one of these is a defect, not a style preference.
> Changing one requires an [ADR](../adr/README.md).
> Audience: everyone writing code in this repository, human or AI.

---

## 1. The server is the only authority

The client renders and requests. It never decides.

A client may compute a _prediction_ to make the interface feel responsive — showing a
battle animation, greying out an unaffordable item — but the server's answer always wins,
and a disagreement is resolved in the server's favour without argument.

Every one of these is decided server-side, with no exceptions:
outcomes of battles · reward contents · currency balances · inventory contents · item and
creature ownership · marketplace prices, listings and sales · progression and unlocks ·
anything time-gated.

**Why it is first:** every other rule here is an optimisation. This one is the difference
between a game and a spreadsheet the player can edit. It cannot be retrofitted — a system
that trusts the client anywhere must be rewritten, not patched.

## 2. Correctness over convenience, in exactly the places it matters

Not everything deserves the same rigour. Two categories, treated differently on purpose:

**Load-bearing** — currency, inventory, ownership, marketplace, battle resolution, auth.
Here: exhaustive tests, explicit invariants, transactions, idempotency, audit trails. Slow
and careful. A bug here loses real value and real trust.

**Everything else** — layout, copy, animation, admin conveniences. Here: move fast, ship,
iterate. A bug is embarrassing, not expensive.

Knowing which category you are in is most of the skill. When unsure, assume load-bearing.

## 3. Make illegal states unrepresentable

Prefer a type the compiler can check over a rule a reviewer must remember.

```ts
// Weak: nothing stops a caller passing a CreatureId, or gems where gold was meant.
function transfer(from: string, to: string, amount: number): void;

// Strong: every one of those mistakes is a compile error.
function transfer(from: WalletId, to: WalletId, amount: Money): Result<Transfer>;
```

This is why the shared kernel brands its identifiers, why `Money` carries its currency and
kind, and why balances are integers rather than floats. See
[shared kernel](../domains/SHARED_KERNEL.md).

## 4. Parse, don't validate

Data crossing a trust boundary is `unknown` until it has been parsed into a type. A
boundary function takes `unknown` and returns a typed value or an error.

Never a function that takes an already-typed argument and merely _asserts_ about it — that
pattern lets an unchecked value through the moment someone forgets to call it.

Boundaries: HTTP requests and responses, environment variables, queue payloads, database
rows from an unmanaged source, anything from a third party.

## 5. Explicit errors for expected outcomes; exceptions for the unexpected

"Not enough gold", "listing already sold", "creature is not yours" — these are ordinary
business outcomes. They are returned as [`Result`](../domains/SHARED_KERNEL.md), so the
compiler forces the caller to handle them.

Throwing is for genuine surprises: a lost connection, an invariant violation, a bug.

## 6. Determinism where outcomes are disputed

Anything a player might contest must be reproducible from stored inputs.

That means: no `Date.now()` and no `Math.random()` in domain logic — inject a `Clock` and a
seeded `RandomSource`. Store the seed and the content version with the result. This is
enforced by lint, not by convention. See [battle domain](../domains/battle/README.md).

Without this, "why did I lose?" and "why did this player get four rares in a row?" are
unanswerable, and every dispute becomes a guess.

## 7. Boring technology, deliberately chosen

Every dependency is a permanent liability: a supply-chain surface, an upgrade treadmill,
and something the next person must learn. Prefer the platform. Prefer one well-understood
tool over three specialised ones.

A new dependency needs a reason in the pull request. "It is popular" is not a reason.

## 8. One way to do each thing

One HTTP client. One validation library. One date approach. One error shape. One
pagination contract. One logger.

Two ways means every reader must know both, every reviewer must check both, and eventually
one of them is wrong in a way nobody notices.

## 9. Delete rather than comment out

Commented-out code is noise that survives forever because nobody knows if it is still
needed. Git remembers. Delete it.

The same applies to a feature nobody uses: removing it is a feature.

## 10. Optimise when you have a measurement

Do not add caching, indexes, denormalisation or worker fan-out because something "might be
slow". Add them when a measurement says so.

The exception is design-level choices that are expensive to reverse later: cursor
pagination, integer money, the outbox, a primary key strategy. Those are decided up front
precisely because retrofitting them means a migration.

## 11. Tests describe behaviour, not implementation

A test name says what the system does for whom:

```ts
it('refuses to overdraw a balance'); // good
it('returns 503 when a dependency is down'); // good
it('calls checkDependencies() twice'); // bad — tests the wiring, not the behaviour
```

A test that breaks on every refactor is a cost, not a safety net. A test that would have
caught a real incident is worth ten that assert on internals.

## 12. Say what is true

Report what happened, not what was hoped for.

- If a command failed, show the output.
- If a step was skipped, say it was skipped.
- If something is unverified, label it unverified.
- If a claim cannot be supported, do not make it.

This is a hard rule for humans and an absolutely hard rule for AI agents, where the failure
mode is a plausible-sounding report of work that never happened. See
[AI agent rules](AI_AGENT_RULES.md).

---

## In practice

Before opening a pull request:

```bash
pnpm verify
```

It runs format, lint, typecheck, test and build. A green `verify` is the minimum bar for
calling work complete — see [testing runbook](../runbooks/TESTING.md).

Related: [Architecture principles](ARCHITECTURE_PRINCIPLES.md) ·
[Security rules](SECURITY_RULES.md) · [Economy integrity rules](ECONOMY_INTEGRITY_RULES.md)
