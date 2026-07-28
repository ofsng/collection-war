# Shared Kernel

> Audience: anyone tempted to add a type to `@collection-war/shared-types`.
> Date: 2026-07-28. Implemented and in use.

---

## What it is

The **only** vocabulary every module in Collection War is allowed to share.

It lives in `packages/shared-types`, has **zero runtime dependencies**, and is imported by
almost everything — which is exactly why every addition to it raises the coupling of the
entire system.

---

## The admission test

A type belongs here only if it satisfies **all four**:

1. **At least three unrelated domains genuinely need it.** Not "might". Not "probably will".
2. **It has no behaviour** beyond shape and trivial construction.
3. **It has no dependency** on any framework, transport or storage concern.
4. **Changing it is expected to be rare.**

If a type describes what _one_ domain owns — a Creature, a Listing, a BattleResult — it
belongs to that domain, not here.

### Why the bar is this high

A shared kernel that grows becomes a second, worse domain layer. Every module depends on it,
so every change to it is a change to every module, and eventually nobody dares change it. The
project then routes around it, and the shared vocabulary stops being shared.

Keeping it small is not tidiness. It is what keeps it usable.

---

## What is in it

### Branding

TypeScript is structural: `type PlayerId = string` means a `CreatureId` is assignable to a
`PlayerId`. For a game whose correctness depends on never confusing one identifier with
another — especially around ownership and currency — that is not good enough.

```ts
const player: PlayerId = creatureId; // compile error, as intended
```

### Identifiers

Every entity id, branded. `PlayerId`, `OwnedCreatureId`, `ListingId`, `WalletId`, and the
rest — plus `IdempotencyKey` and `CorrelationId`.

All UUIDv7. See [data architecture](../architecture/DATA_ARCHITECTURE.md#identifier-strategy)
for why.

### Time

`IsoTimestamp`, `IsoDate`, `DurationMs`, `TimeZoneId` — and, importantly, the two interfaces
that make domain logic deterministic:

```ts
interface Clock {
  now(): IsoTimestamp;
  nowMs(): number;
}
interface RandomSource {
  next(): number;
  nextInt(min, max): number;
  readonly seed: string;
}
```

Domain code is **forbidden** from calling `Date.now()` or `Math.random()` — enforced by
lint. Injecting these is what makes a battle replayable and a reward investigable.

`RandomSource` must be a deterministic PRNG, **never** a CSPRNG. Reproducibility is the
point. Cryptographic randomness belongs to token generation instead.

### Locale

`SupportedLocale` (`tr-TR` | `en`), the default and fallback, `TranslationKey`,
`LocalizedText`, `LocalizedRecord`.

### Money — the most safety-critical type here

```ts
interface Money {
  readonly kind: 'SOFT' | 'PREMIUM' | 'PROMO' | 'FIAT';
  readonly currency: CurrencyCode;
  readonly amount: MinorUnits; // INTEGER
  readonly precision: number;
}
```

Three rules, none optional:

1. **Integers in minor units.** `0.1 + 0.2 !== 0.3` in IEEE-754, and in a ledger that
   difference is real value appearing or disappearing.
2. **Amount and currency travel together**, so the compiler rejects adding gems to gold.
3. **Kinds are not interchangeable.** This is the structural barrier between gameplay
   currency and real money — see
   [E1](../constitution/ECONOMY_INTEGRITY_RULES.md#e1-currency-kinds-are-separate-and-never-convert-implicitly).

Also here: `LedgerReason` and `LedgerDirection`, because every module that touches value must
describe the movement the same way.

### Pagination

`CursorPage<T>`, `CursorPageRequest`, `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`. Cursor-based, for
the reasons in [API architecture](../architecture/API_ARCHITECTURE.md#pagination).

### Result and errors

```ts
type Result<T, E = AppErrorShape> = Ok<T> | Err<E>;
```

Expected outcomes are returned, not thrown, so the compiler forces the caller to handle them.
`AppErrorShape`, `AppErrorCode` and `AppErrorCategory` give the whole system one error shape.

### Audit

`Actor`, `AuditMetadata`, `EntityVersion`, `Versioned`, `SoftDeletable`, `Timestamped`.

`Actor` distinguishes an administrator acting **on a player's behalf** from the player acting
themselves — keeping those apart is what stops an admin action being attributed to the
player.

### Content versioning

`ContentVersion` and `BattleEngineVersion`, kept separate because rules and numbers change
independently.

---

## What is deliberately NOT here

| Not here                | Where it belongs               | Why                                       |
| ----------------------- | ------------------------------ | ----------------------------------------- |
| `Creature`, `Species`   | creature domains               | One domain owns them                      |
| `Listing`, `Order`      | marketplace                    | Same                                      |
| `BattleResult`          | battle-engine                  | Same                                      |
| `Player` (the entity)   | player-profile                 | `PlayerId` is shared; the entity is not   |
| Zod schemas             | `validation`                   | The kernel has zero dependencies          |
| Repository interfaces   | `domain`                       | They are domain contracts, not vocabulary |
| Anything with behaviour | wherever the behaviour belongs | The kernel is shapes                      |

---

## Adding something

1. Check the admission test. Honestly.
2. If it fails, put it in the domain that owns it.
3. If it passes, note in the pull request **which three domains** need it.
4. Get a review. A shared-kernel change is an architecture change.

## Changing something

A change here touches every module. Treat it as a breaking change:

- Additive (a new optional field, a new type) is usually safe.
- Changing a meaning is not. Introduce the new thing, migrate, then remove the old.
- Removing something requires knowing every caller — which the type system will tell you.

Related: [Domain map](DOMAIN_MAP.md) ·
[Dependency rules](../architecture/DEPENDENCY_RULES.md) · [Glossary](../product/GLOSSARY.md)
