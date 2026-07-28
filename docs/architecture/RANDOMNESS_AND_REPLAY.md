# Randomness and Replay

> Audience: anyone writing code whose outcome a player might dispute. Date: 2026-07-28.

---

## The requirement

> A player must be able to be told **why** an outcome happened — months later, by someone who
> was not there.

Everything below follows from that one sentence.

---

## Seeds

Every random outcome comes from a **server-generated seed**, persisted with its result.

```text
seed = server-generated, cryptographically random at creation
     → stored on the battle / expedition / roll record
     → derived per purpose via deriveSeed(seed, purpose)
     → replayed exactly by createSeededRandom(derivedSeed)
```

**The client never supplies, sees in advance, or influences a seed.** A client-chosen seed is
outcome selection: roll locally until you like the result, then submit that seed.

The seed is disclosed **with the result**, so a replay can be verified.

## Derived streams

A battle draws randomness for several purposes. They must not share one stream:

```ts
createSeededRandom(deriveSeed(battleSeed, 'turn-order'));
createSeededRandom(deriveSeed(battleSeed, 'damage-variance'));
createSeededRandom(deriveSeed(battleSeed, 'status-application'));
createSeededRandom(deriveSeed(battleSeed, 'critical'));
createSeededRandom(deriveSeed(battleSeed, 'drops'));
```

**Why:** if they shared one stream, adding a single new roll anywhere would shift every
subsequent value — and every previously recorded battle would replay differently after the
change. Derived streams make new rolls additive.

---

## Determinism rules

These are the ways a "deterministic" engine quietly stops being one. All are enforced.

| Rule                                                                      | Enforcement                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| No `Math.random()`                                                        | lint (`no-restricted-properties`), verified                                                |
| No `Date.now()` / `new Date()`                                            | lint (`no-restricted-globals`), verified                                                   |
| No I/O of any kind in resolution                                          | `resolve()` is **synchronous** — an `await` cannot be added without changing the signature |
| **No iteration over `Map`, `Set` or object keys where it affects output** | Review, and ordered arrays in every engine type                                            |
| Integer arithmetic; explicit rounding                                     | Review + test vectors                                                                      |
| No locale-sensitive comparison                                            | Review — Turkish casing differs from ASCII                                                 |

The fourth is the one that catches people. `BattleInput.participants[].creatures` is an
**ordered array** precisely so that no map iteration is needed.

### Floating point

Damage, stats and rewards are computed in **integers**. Where a coefficient is fractional it
is expressed in **basis points** and applied with an explicit `Math.floor`:

```ts
const damage = Math.floor((attack * abilityCoefficientBp) / 10_000);
```

`0.1 + 0.2 !== 0.3` in IEEE-754, and two platforms can disagree in the last bit. Integers
cannot.

---

## Versioning

Two versions are recorded on every outcome, and they are **separate on purpose**:

| Version               | Changes when                 | Example                                |
| --------------------- | ---------------------------- | -------------------------------------- |
| `BattleEngineVersion` | Resolution **logic** changes | Turn order now breaks ties differently |
| `ContentVersion`      | Authored **data** changes    | Koruk's base attack is rebalanced      |

A battle fought in March must replay under March's rules **and** March's numbers. Recording
only one of the two makes replay silently wrong.

```ts
interface BattleResult {
  readonly seed: string;
  readonly engineVersion: BattleEngineVersion;
  readonly contentVersion: ContentVersion;
  readonly events: readonly BattleEvent[];
}
```

`canReplay(version)` answers honestly. When it returns `false`, the correct response is to say
"this battle was fought under rules we no longer run", not to replay it under current rules
and present the answer as authoritative.

---

## The replay log

Every battle stores its ordered event log — enough to reconstruct the fight without re-running
resolution.

```ts
interface BattleEvent {
  turn: number;
  sequence: number;
  type: string; // 'ability_used' | 'damage_dealt' | 'status_applied' | ...
  data: Record<string, number | string | boolean>;
}
```

It serves three audiences, which is why it is worth its storage cost:

1. **The client** animates it — so the client never computes an outcome.
2. **Support** explains a disputed result from it.
3. **Tests** assert on it, which is far more precise than asserting on a final winner.

---

## Verification

Determinism is not assumed; it is tested.

```ts
it('produces an identical result for an identical seed', () => {
  const a = engine.resolve(input);
  const b = engine.resolve(input);
  expect(a).toEqual(b);
});

it('produces a different result for a different seed', () => { ... });

it('does not mutate its input', () => {
  const snapshot = structuredClone(input);
  engine.resolve(input);
  expect(input).toEqual(snapshot);
});
```

Plus property tests: **every battle terminates**, no health goes negative, no energy exceeds
its maximum, turn count is bounded.

> **If a replay ever disagrees with its recorded result, that is a critical defect.** The
> guarantee is either true or worthless — there is no partially deterministic engine.

---

## Where cryptographic randomness IS used

Seeded PRNG is for gameplay. It is **predictable by design**, which is the entire point.

Anything that must be unguessable uses `node:crypto` instead:

| Use                                | Source                                                  |
| ---------------------------------- | ------------------------------------------------------- |
| Battle / expedition seeds          | `randomBytes` — then stored, and replayed with the PRNG |
| Session and refresh tokens         | `randomBytes`                                           |
| Password salts                     | `randomBytes`                                           |
| Idempotency keys (client-side)     | `crypto.randomUUID()`                                   |
| Damage variance, drops, turn order | **seeded PRNG**                                         |

Using a CSPRNG for gameplay would make outcomes unreproducible; using a PRNG for tokens would
make them predictable. Both mistakes are equally bad, in opposite directions.

Related: [ADR-0015](../adr/ADR-0015-deterministic-battle-engine.md) ·
[ANTI_CHEAT_ARCHITECTURE.md](ANTI_CHEAT_ARCHITECTURE.md) ·
[CONTENT_VERSIONING.md](CONTENT_VERSIONING.md)
