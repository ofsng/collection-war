# ADR-0001: TypeScript as the primary implementation language

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Platform bootstrap

## Context

Collection War needs one authoritative backend and three clients (web, iOS, Android) that
share contracts. A small team must maintain all four.

The economy and battle systems depend on types that make illegal states unrepresentable —
branded identifiers, money that carries its currency and kind, results that force error
handling. That requires a language whose type system the team will actually use everywhere,
not only on the server.

## Decision

**TypeScript in strict mode, pinned to 5.9.3**, across every application and package.

Strictness is set once in `tsconfig.base.json` and includes `noUncheckedIndexedAccess`,
`noImplicitOverride`, `noImplicitReturns` and `noFallthroughCasesInSwitch`. A package may add
strictness; it may never remove it.

**TypeScript 7.x was deliberately not adopted**, despite being available: the lint and build
ecosystem is not yet aligned with it, and a bootstrap is exactly the wrong moment to be the
first to find out.

## Alternatives considered

**Go or Rust for the backend, TypeScript for clients.** Better raw performance and, in
Rust's case, a stronger type system. Rejected because contracts would have to be defined
twice and kept in sync by discipline — and the shared kernel, the deterministic battle engine
and the economy invariants would all be duplicated or code-generated. At this scale the
runtime performance difference is not the constraint; developer throughput is.

**Kotlin Multiplatform.** Genuine code sharing including native mobile. Rejected: a much
smaller ecosystem for the web client, and a heavier build.

**JavaScript with JSDoc types.** No build step. Rejected: the type system is the point here,
and JSDoc types are checked less consistently and expressed less precisely.

**TypeScript 7.x.** Faster compilation. Rejected for now — see above. Reconsider once
typescript-eslint and the build tooling are aligned.

## Positive consequences

- One language across the whole system; one mental model.
- Contracts are shared as code, not as documentation.
- Branded types make identifier and currency confusion a compile error.
- A very large ecosystem for every layer.

## Negative consequences

- Node's runtime performance is a ceiling for CPU-bound work. Mitigated by the battle engine
  being pure and parallelisable.
- Types vanish at runtime, so every trust boundary still needs runtime validation — hence
  `@collection-war/validation`.
- A build step everywhere.
- Node's ESM/CJS split is a recurring source of friction. Mitigated by compiling shared
  packages to CommonJS, which every consumer can load.

## Risks

- Pinning to 5.9.x delays the 7.x compilation improvements.
- Strict mode makes some third-party types awkward. Accepted: an awkward cast at one boundary
  is cheaper than weakened checking everywhere.

## Review conditions

- typescript-eslint and the build toolchain fully support TypeScript 7.x → evaluate upgrading.
- A CPU-bound workload is measurably constrained by Node → consider extracting that specific
  workload, not the language.
