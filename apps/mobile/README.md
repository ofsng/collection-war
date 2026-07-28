# Mobile — `@collection-war/mobile`

> **Status:** **Typechecked, linted and unit-tested (13 tests). NEVER RUN on a device or emulator.**

## Responsibility

The iOS and Android client. Renders and requests. **Decides nothing.**

## Public interface

- `app/index.tsx` — the health screen, with locale switching.

## Allowed dependencies

- `@collection-war/api-client`, `localization`, `shared-types`
- Expo, React Native, expo-router, TanStack Query, expo-secure-store, expo-localization

## Forbidden dependencies

- `@collection-war/database`, `pg`, `ioredis`, `bullmq`, `drizzle-orm`
- `@collection-war/design-system` — its components render DOM elements, which do not exist in React Native
- NestJS, Fastify, Next.js

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/mobile run dev    # `expo start`
pnpm --filter @collection-war/mobile run android
pnpm --filter @collection-war/mobile run ios
pnpm --filter @collection-war/mobile run build    # A documented no-op — native builds need EAS or a native toolchain
pnpm --filter @collection-war/mobile run typecheck
pnpm --filter @collection-war/mobile run test    # Logic tests only (13)
```

## Notes

- **On an Android emulator, `localhost` is the emulator, not your machine.** Use `10.0.2.2`. This costs everyone exactly one hour, once.
- `src/lib/config.ts` **mirrors** the design-system palette, because RN cannot use DOM components. A test asserts the values match. Unifying the token layer is [deferred work](../../docs/status/DEFERRED_WORK.md) — a colour change must be made in both places.
- React Native components are **not** rendered under Vitest: doing so tests a simulation of React Native rather than React Native. On-device testing (Maestro or Detox) is deferred.
- `metro.config.js` declares `watchFolders` and `nodeModulesPaths` — Metro does not understand pnpm workspaces without them.

## Ownership

Mobile. **Never overstate what has been verified** — this is the least-verified surface in the project.
