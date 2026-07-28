# ADR-0007: Expo and React Native for mobile

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Collection War must ship on Android and iOS. The same team maintains the backend and the web
client, and there is no dedicated mobile developer.

The mobile client must share contracts with the server — the API client, the shared types,
the localization catalogue. Duplicating those in two native languages would guarantee drift.

## Decision

**Expo 57.0.8 with React Native 0.86.2 and expo-router**, one codebase for both platforms.

Secure storage via `expo-secure-store` (Keychain / Keystore), device locale via
`expo-localization`.

## Alternatives considered

**Native Swift and Kotlin.** The best possible platform integration and performance.
Rejected decisively: two additional codebases, two additional skill sets, and every contract
implemented three times. For a small team this is not a trade-off, it is a different project.

**Flutter.** Excellent performance and a single codebase. Rejected: Dart means the shared
TypeScript packages cannot be used at all — every type, every schema and the entire API
client would be duplicated. The sharing is the whole point.

**React Native without Expo (bare workflow).** More control over native modules. Rejected:
Expo's managed workflow removes most native build maintenance, and EAS Build removes the need
for a Mac to produce iOS builds. The control is not currently needed and can be adopted later
without rewriting.

**A progressive web app.** Cheapest by far. Rejected: no app-store presence, weaker push
notifications, and worse platform integration for a game.

## Positive consequences

- One codebase, two platforms.
- **The shared packages work unchanged** — `api-client`, `shared-types` and `localization`
  are consumed by the mobile app exactly as by the web client.
- Keychain / Keystore access through a documented API, so tokens are stored correctly by
  default.
- Over-the-air updates for JavaScript-only changes.
- EAS Build removes the macOS requirement for iOS builds.

## Negative consequences

- **React Native cannot use the design system's DOM components.** Mobile therefore mirrors
  the design tokens locally, which is real duplication and is recorded in
  [deferred work](../status/DEFERRED_WORK.md) rather than pretended away.
- A performance ceiling below native, relevant if the game becomes animation-heavy.
- Expo SDK upgrades are periodic and occasionally disruptive.
- Metro needs explicit configuration to work in a pnpm workspace — `watchFolders` and
  `nodeModulesPaths`.
- **Testing is limited.** React Native components cannot meaningfully be unit-tested under
  Vitest; doing so tests a simulation of React Native rather than React Native.

## Risks

- **The mobile app has never been run on a device or an emulator.** It typechecks, lints and
  passes its logic tests — that is all that is claimed. See
  [bootstrap report](../status/BOOTSTRAP_REPORT.md).
- Store review policies are a real constraint, particularly around randomised rewards.
- Dependence on Expo's release cadence.

## Review conditions

- Animation or rendering performance becomes a player-visible problem → evaluate native
  modules for the specific screen, not a rewrite.
- Expo's constraints block a required capability → evaluate the bare workflow.
- **Before the first release:** the app must actually run on both platforms, and on-device
  testing (Maestro or Detox) must exist.
