# ADR-0008: NestJS on Fastify for the API

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

The API is the only authority in the system ([ADR-0024](ADR-0024-server-authoritative-state.md)).
It will eventually host around twenty-one domain modules, each needing its own controllers,
services, authorization and validation.

A modular monolith ([ADR-0005](ADR-0005-modular-monolith.md)) needs a framework whose module
system reflects and reinforces the intended boundaries — otherwise the boundaries exist only
in documentation.

## Decision

**NestJS 11.1.28 on the Fastify 5 adapter.**

- `@fastify/helmet` for security headers.
- `@nestjs/swagger` for OpenAPI, served only outside production.
- Dependency injection via **string tokens** for framework-free dependencies, so that
  `@collection-war/domain` never has to import `@nestjs/common` to gain an `@Injectable()`
  decorator — that would invert the dependency direction the architecture rests on.

## Alternatives considered

**Fastify alone.** Fastest, smallest, least magic. Rejected: at twenty-one modules, the
project would end up building its own module system, dependency injection and lifecycle
management — badly, and without documentation. Nest is that, already built.

**Express.** The default choice. Rejected: measurably slower, no first-class TypeScript
story, and the same missing structure as bare Fastify.

**tRPC.** End-to-end type safety with no schema layer. Rejected: it works well for a
TypeScript-only client, but a released mobile app needs a **versioned, stable HTTP contract**
that does not depend on the client sharing a build with the server.

**Hono or Elysia.** Modern and fast. Rejected: smaller ecosystems and less structure for a
system that will grow to this many modules.

## Positive consequences

- A module system that maps directly onto domain modules.
- Dependency injection makes testing straightforward, and makes the framework-free packages
  injectable without contaminating them.
- Fastify is roughly twice Express's throughput and has better schema-based validation.
- OpenAPI generated from decorators.
- Guards, interceptors and filters give clean places for authorization, correlation ids and
  the global error shape — all of which must apply uniformly.
- **Verified working**: the API starts, serves health, readiness and system info, applies
  security headers, and returns the correct error envelope.

## Negative consequences

- **Decorator metadata is a real constraint.** `emitDecoratorMetadata` must be on and
  `isolatedModules` off, and `@typescript-eslint/consistent-type-imports` must be disabled
  for the API — rewriting a constructor-parameter import to `import type` erases it from the
  metadata and every injected dependency silently arrives `undefined`.
- **Vitest cannot boot the Nest container** without an additional SWC transform, because
  esbuild does not emit `design:paramtypes`. Resolved by testing controllers and services by
  direct construction, which is arguably better anyway — dependencies are visible in the test.
- More framework concepts to learn than bare Fastify.
- Swagger UI on Fastify additionally requires `@fastify/static`, which was discovered at
  runtime during the bootstrap.
- Startup is slower than a minimal server.

## Risks

- Framework lock-in. Mitigated by the layer rule: business logic lives in framework-free
  packages, so Nest is genuinely replaceable at the transport layer.
- Decorator-metadata fragility. Mitigated by the tsconfig and lint configuration being
  explicit and commented about _why_.

## Review conditions

- Nest's overhead becomes measurable in profiling → the transport layer is thin enough to
  replace without touching domain code.
- TypeScript's decorator implementation changes in a way that breaks metadata emission.
