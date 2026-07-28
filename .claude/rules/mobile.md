# Rule: Mobile

**Canonical:** [ADR-0007](../../docs/adr/ADR-0007-expo-react-native-mobile.md) ·
[LOCALIZATION_ARCHITECTURE.md](../../docs/architecture/LOCALIZATION_ARCHITECTURE.md)

---

## Status, stated honestly

**The mobile app has never been run on a device or an emulator.** It typechecks, lints and
passes 13 logic tests. That is the complete extent of what is verified — do not describe it
as working.

## Rules

**Secure storage for anything sensitive.** `expo-secure-store` → Keychain / Keystore. Every
call is wrapped: a storage failure degrades to "no stored preference", never a crash at
launch.

**Every storage read is re-validated.** Stored data is not trusted input; it may have been
written by an older build.

**Touch targets ≥ 44pt.** Apple's minimum, roughly Android's 48dp. Smaller targets fail
accessibility review and are measurably harder to hit.

**`SafeAreaProvider` and `useSafeAreaInsets`.** Without them, content renders under the notch
and the gesture bar, and the affected controls become untappable.

**No literal user-facing text.** Every string from `t(key)`.

## The design-system situation

React Native cannot use the design system's DOM components. `src/lib/config.ts` **mirrors**
the palette, and a test asserts the values match.

This duplication is documented in [DEFERRED_WORK.md](../../docs/status/DEFERRED_WORK.md), not
pretended away. **A colour change must be made in both places.**

## Testing

Logic only — locale resolution, config, storage adapters. Native modules are stubbed in
`src/test-stubs/`.

**React Native components are not rendered under Vitest.** Doing so tests a simulation of
React Native rather than React Native. On-device testing (Maestro or Detox) is deferred work.

## The localhost trap

On an Android emulator, `localhost` is the **emulator**, not your machine. Use `10.0.2.2`.
This costs everyone exactly one hour, once.

## Never

- `pnpm build` expecting an artefact — it is a documented no-op
- Create an EAS project (an account-level action with cost implications)
- Store a token in plain storage
- Put a secret behind `EXPO_PUBLIC_`
