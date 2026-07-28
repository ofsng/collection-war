# Design System — `@collection-war/design-system`

> **Status:** Tokens and five primitives, tested (11 tests).

## Responsibility

Design tokens and React **DOM** primitives for the web and admin applications.

## Public interface

- Tokens: `colors`, `spacing`, `typography`, `radii`, `breakpoints`, `statusColors`
- Primitives: `Stack`, `Card`, `Button`, `StatusBadge`, `Text`, `DefinitionRow`
- `./styles.css` — document-level base styles

## Allowed dependencies

- `@collection-war/shared-types`
- React (peer)

## Forbidden dependencies

- `@collection-war/database`, `pg`, `ioredis`, `bullmq`, `drizzle-orm`
- NestJS, Fastify
- Next.js-specific APIs — it is consumed by two applications

Enforced by `no-restricted-imports` in `eslint.config.mjs`, verified against deliberate
violations. See [DEPENDENCY_RULES.md](../../docs/architecture/DEPENDENCY_RULES.md).

## Commands

```bash
pnpm --filter @collection-war/design-system run build
pnpm --filter @collection-war/design-system run typecheck
pnpm --filter @collection-war/design-system run test    # jsdom
```

## Notes

- **Mobile does not consume this package.** React Native renders native views, so a `<button>` primitive is meaningless there. `apps/mobile/src/lib/config.ts` mirrors the tokens; unifying them is [deferred work](../../docs/status/DEFERRED_WORK.md).
- Inline style objects rather than a CSS-in-JS runtime: zero dependencies, identical behaviour in server components and tests, and it defers the styling-strategy decision until there is a visual design. Recorded as an [open decision](../../docs/status/OPEN_DECISIONS.md).
- **Accessibility is built in, not added.** `Button` is a real `<button>` with an explicit `type`. `StatusBadge` always carries a text label — colour alone is invisible to a screen reader and ambiguous to a colour-blind player.
- `styles.css` never removes the focus ring. `outline: none` makes the app unusable by keyboard, and it is invisible to whoever removed it.

## Ownership

Web. A change affects both applications.
