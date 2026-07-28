# ADR-0006: Next.js for web and admin

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Two browser applications are needed: a player-facing web client and an administration
console. Both need routing, server-side rendering, and a build pipeline. Both must share
packages with the mobile client, which is React Native.

The web client also has a specific requirement that turns out to matter: **the player's
locale must be resolved before the first paint.** Resolving it on the client means rendering
Turkish text into an `lang="en"` document and visibly swapping it after hydration — bad for
screen readers and bad to look at.

## Decision

**Next.js 16.2.12 with the App Router, React 19.2.8**, for both `apps/web` and `apps/admin`.

Both declare `export const dynamic = 'force-dynamic'` at the root layout, because the layout
reads `cookies()` and `headers()` to resolve locale server-side — which is inherently
per-request.

## Alternatives considered

**Vite + React SPA.** Simpler, faster builds, no server runtime. Rejected: no server-side
rendering, so locale resolution flashes, and the admin console would ship its (currently
denying) route guard to the client where it can be inspected. Server-side guards are the
correct model for an admin surface.

**Remix / React Router 7.** A good fit and arguably a simpler mental model. Rejected
narrowly — Next has the larger ecosystem and the team is more likely to find answers. Not a
strong preference.

**Astro.** Excellent for content sites. Rejected: this is an application, not a content site.

**Two different frameworks for web and admin.** Rejected: two build pipelines, two sets of
conventions, and two places to fix everything.

## Positive consequences

- Server-side locale resolution, so the first paint is correct.
- The admin route guard runs on the server; unauthorised content is never sent.
- Shared React components with the design system.
- Response headers are configured declaratively in `next.config.mjs`, including the stricter
  admin set (`frame-ancestors 'none'`, `no-store`, `noindex`).
- One framework, two applications, one set of conventions.

## Negative consequences

- **A server runtime to deploy**, rather than static files on a CDN.
- The App Router's server/client component split is a genuine source of confusion, and the
  errors it produces are often unclear.
- Next moves fast; upgrades are not always smooth.
- Configuration deprecations are frequent — the `eslint` key in `next.config.mjs` was
  removed in this version, which surfaced during the bootstrap.
- **Turbopack's static prerendering of `/_not-found` failed** with a layout that reads
  `cookies()`. Resolved by `force-dynamic`, which is correct anyway, but it cost time to
  diagnose.

## Risks

- Next's release cadence outpacing the project's capacity to upgrade. Mitigated by pinning
  exact versions.
- Server-rendering cost per request. Mitigated by both applications being small; revisit if
  it becomes measurable.

## Review conditions

- Server-rendering cost becomes a measured problem → evaluate static generation for the
  pages that permit it.
- A Next major version requires a large migration → weigh it against Vite + a router at that
  point.
