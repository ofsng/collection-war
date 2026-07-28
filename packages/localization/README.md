# Localization — `@collection-war/localization`

> **Status:** Implemented and tested (23 tests). Shell translations complete in both locales.

## Responsibility

Translation catalogue, locale resolution and locale-aware formatting for `tr-TR` and `en`.

## Public interface

- `createTranslator(locale)` → `t(key, values)`
- `resolveLocale(stored, acceptLanguage, deviceLocales)` · `matchLocale`
- `formatNumber` · `formatCurrencyAmount` · `formatPercent` · `formatDate` · `formatDuration` · `pluralCategory`
- `LocaleStore` — the persistence _interface_; each client implements it

## Allowed dependencies

- `@collection-war/shared-types`

## Forbidden dependencies

- Every other workspace package
- Any framework — it is consumed by three different ones

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/localization run build
pnpm --filter @collection-war/localization run typecheck
pnpm --filter @collection-war/localization run test
```

## Notes

- **Catalogue completeness is a failing test.** A key added to `en` and never translated fails the build — that is the most common localization defect, caught structurally.
- `formatCurrencyAmount` takes **integer minor units** and divides only at the display step. Every layer beneath deals in integers, which is what keeps the economy arithmetic exact.
- Turkish `1.234,56` and English `1,234.56` are inverses. In a game with a real economy, a formatting bug is a _value_ bug.
- `matchLocale` lowercases with an explicit locale: `'I'.toLowerCase()` is `'ı'` under Turkish, which would otherwise break matching on exactly the platform this targets.

## Ownership

Shared. Adding a string means adding it to **both** locales.
