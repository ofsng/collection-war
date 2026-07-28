#!/usr/bin/env node
/**
 * `pnpm build` for the mobile app.
 *
 * There is deliberately no build step here. A real Expo build is an EAS cloud build or a
 * local native compile; both need credentials, a signing identity and (for iOS) macOS.
 * Creating any of that is outside the scope of the platform bootstrap and would incur
 * cost, so `build` is a no-op that says so rather than a command that pretends to work.
 *
 * The mobile app is still verified on every run by `typecheck`, `lint` and `test`.
 */
console.log(
  [
    '@collection-war/mobile: no build step.',
    '',
    '  Native artefacts are produced by EAS Build or a local native toolchain, neither of',
    '  which is configured — see docs/status/DEFERRED_WORK.md.',
    '',
    '  Verified instead by: pnpm --filter @collection-war/mobile run typecheck | test',
    '  Run on a device with:  pnpm --filter @collection-war/mobile run dev',
  ].join('\n'),
);
