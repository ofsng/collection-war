import type { Brand } from './brand';

/**
 * Time in Collection War is always server time.
 *
 * A client clock is attacker-controlled input. Anything gated on time — expedition
 * completion, marketplace listing expiry, quest resets, cooldowns, rate limits — is
 * decided by the server and only *displayed* by the client. See
 * docs/constitution/SECURITY_RULES.md#server-authority.
 */

/** UTC instant, ISO-8601 with an explicit `Z` offset. The only wire format for a point in time. */
export type IsoTimestamp = Brand<string, 'IsoTimestamp'>;

/** Calendar date with no time or zone, `YYYY-MM-DD`. For things like daily quest keys. */
export type IsoDate = Brand<string, 'IsoDate'>;

/** A duration in whole milliseconds. Never a float; never "5m" strings on the wire. */
export type DurationMs = Brand<number, 'DurationMs'>;

/** IANA zone name, e.g. `Europe/Istanbul`. A display concern only — never a storage format. */
export type TimeZoneId = Brand<string, 'TimeZoneId'>;

/**
 * The only sanctioned way for business logic to learn what time it is.
 *
 * Domain packages are forbidden from calling `Date.now()` directly (enforced by the
 * `no-restricted-globals` rule in eslint.config.mjs). Injecting a clock is what makes
 * battle resolution, expedition completion and reward windows reproducible in tests and
 * replayable in an audit.
 */
export interface Clock {
  now(): IsoTimestamp;
  nowMs(): number;
}

/**
 * The only sanctioned source of randomness in domain logic.
 *
 * Ambient `Math.random()` makes an outcome impossible to reproduce, which means a
 * disputed battle result or a suspicious drop cannot be investigated. A seeded source
 * lets the server persist the seed and replay the exact sequence.
 *
 * The implementation must be a deterministic PRNG, never a CSPRNG — reproducibility is
 * the point. Cryptographic randomness belongs to token and secret generation instead.
 */
export interface RandomSource {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [minInclusive, maxInclusive]. */
  nextInt(minInclusive: number, maxInclusive: number): number;
  /** The seed that produced this sequence, so a run can be replayed exactly. */
  readonly seed: string;
}
