/**
 * Nominal typing helper.
 *
 * TypeScript is structural: `type PlayerId = string` means a `CreatureId` is assignable
 * to a `PlayerId`. For a game whose correctness depends on never confusing one
 * identifier with another — especially around ownership and currency — that is not good
 * enough. Branding makes the compiler reject the mistake.
 *
 *   const p: PlayerId = creatureId; // compile error, as intended
 */

declare const BRAND: unique symbol;

export type Brand<TValue, TBrand extends string> = TValue & { readonly [BRAND]: TBrand };

/**
 * Unwraps a branded type back to its underlying primitive. Needed at the exact edges
 * where a branded value meets a system that does not know about brands (SQL parameters,
 * JSON payloads, URL segments).
 */
export type Unbrand<T> = T extends Brand<infer TValue, string> ? TValue : T;
