# ADR-0021: Centralized localization, Turkish-first

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Collection War ships in Turkish and English from day one, on three clients. Turkish is the
**default**, not a translation of an English product.

Two facts make this structural rather than cosmetic:

- **Number formats are inverses.** Turkish writes `1.234,56` where English writes `1,234.56`.
  In a game with a real economy, a formatting mistake is a _value_ mistake.
- **Turkish casing is not ASCII casing.** `'I'.toLowerCase()` is `'ı'` under a Turkish
  locale. Any code that lowercases for comparison breaks on exactly the platform this project
  targets.

## Decision

**One shared package, `@collection-war/localization`**, used by all three clients and by the
server where it needs to resolve text.

- Flat, dotted, stable translation keys.
- Three-step fallback: requested locale → English → **the raw key**.
- All formatting via `Intl`, with formatters cached by (locale, options).
- Locale resolution: **explicit stored preference → device/browser → default**.
- **No hardcoded user-facing text in any application.**
- **Catalogue completeness is a failing test**, not a review item.

## Alternatives considered

**`next-intl` for web, `i18n-js` for mobile, something else on the server.** Each is
idiomatic for its platform. Rejected: three libraries means three key formats, three fallback
behaviours and three sets of formatting bugs — and a key that exists on web but not mobile is
invisible until a player reports it.

**`i18next`.** Mature, feature-rich, works everywhere. Rejected as more than is needed: for
two locales and a flat catalogue, the shared package is under 200 lines and has no
dependencies. Revisit if a third locale plus complex pluralisation arrives.

**Server-side translation of everything.** Rejected: it makes every string a network round
trip and prevents offline rendering of the interface.

**Nested translation objects.** Rejected deliberately: nesting makes it impossible to tell at
a glance whether two locales cover the same keys, and turns a missing translation into a
runtime `undefined` deep in a lookup rather than an obviously absent key.

## Positive consequences

- **One catalogue, one key format, one fallback behaviour** across three clients.
- Locale-correct formatting for numbers, currency, dates, durations and percentages.
- `formatCurrencyAmount` takes **integer minor units** and divides only at the display step —
  which is what keeps the economy arithmetic exact everywhere beneath it.
- The completeness test catches the most common localization defect: a key added to `en`
  during a feature and never translated.
- Zero runtime dependencies.
- Server-side resolution on web means the first paint is already correct, with no
  post-hydration flash.

## Negative consequences

- A hand-written package to maintain, rather than a maintained library.
- No translation-management-system integration; no translator workflow yet.
- Pluralisation support is a category selector, not a full ICU MessageFormat implementation.
- No RTL support — not needed for Turkish or English, and would need real work for Arabic or
  Hebrew.
- Content localization (creature names, quest text) is designed but not built.

## Risks

- Outgrowing the hand-written package as content grows. Mitigated by the interface being
  small: `t(key, values)` and the format functions. Swapping the implementation later would
  not touch call sites.
- Translation drift as content scales. Mitigated by the completeness test, which must be
  extended to content catalogues when they exist.

## Review conditions

- A third locale, or complex pluralisation → evaluate `i18next` or ICU MessageFormat.
- Translators need a workflow → integrate a translation management system; the flat key format
  is designed to export cleanly.
- An RTL locale is required → substantial layout work, and its own ADR.
