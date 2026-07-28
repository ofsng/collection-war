# Rule: Localization

**Canonical:** [LOCALIZATION_ARCHITECTURE.md](../../docs/architecture/LOCALIZATION_ARCHITECTURE.md) ·
[ADR-0021](../../docs/adr/ADR-0021-centralized-localization.md)

---

## The rule

**No hardcoded user-facing text. Anywhere. In any application.**

Every visible string comes from `t(key)`. Both `tr-TR` and `en`, always together.

Two commented exceptions exist, both in `apps/web`: `error.tsx` and `loading.tsx` use
literals because they must render even when the locale provider is what failed.

## Turkish is not a translation layer

`tr-TR` is the **default**; `en` is the fallback. This is a product decision with technical
consequences.

## Two things that are easy to get wrong

**Number formats are inverses.** Turkish `1.234,56` is English `1,234.56` — the same digits,
different numbers. Never build a formatted number by string concatenation. In a game with a
real economy, this is a _value_ bug, not a typography one.

**Turkish casing is not ASCII casing.** `'I'.toLowerCase()` is `'ı'` under a Turkish locale.
Any comparison that lowercases — locale matching, header parsing, a lookup key — must specify
the locale explicitly, or it breaks on exactly the platform this project targets.

## Formatting always goes through the package

`formatNumber` · `formatCurrencyAmount` · `formatPercent` · `formatDate` · `formatDateTime` ·
`formatDuration` · `pluralCategory`

**`formatCurrencyAmount` takes integer minor units** and divides only at the display step.
Every layer beneath it deals in integers, and that is what keeps the economy arithmetic exact.

## Keys

Dotted, flat, stable: `system.api.healthy`.

Flat rather than nested, deliberately — nesting makes it impossible to see at a glance
whether two locales cover the same keys.

**A key is stable API.** Renaming one breaks every locale file and every released mobile
build that has not updated.

## Adding a string

1. Add to `en` in `packages/localization/src/messages.ts`
2. **Add to `tr-TR`** — the completeness test fails otherwise, and that is the point
3. Use `t('your.key')`

Never leave a key untranslated "for now". The test is what makes "for now" impossible.

## Pluralisation

English distinguishes one/other; Turkish does not. A template written as `"{n} items"` cannot
be translated word for word. Use `pluralCategory` and per-category keys.
