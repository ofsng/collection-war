import type { Brand } from './brand';

/**
 * Content versioning — see docs/architecture/DATA_ARCHITECTURE.md#content-versioning.
 *
 * Game content (species stats, drop tables, quest definitions, balance numbers) changes
 * over the life of the product, while released mobile builds do not update in lockstep.
 * Two consequences the platform must handle from day one:
 *
 *   1. A battle that happened last month was resolved under last month's balance data.
 *      To replay or audit it, the exact content version must be recorded WITH the result.
 *      Without this, "why did I lose that fight" is unanswerable.
 *
 *   2. An old client may hold stale content. The server decides outcomes regardless, but
 *      it needs to know what the client believed in order to explain a mismatch.
 *
 * Content versions are therefore recorded on every outcome that depends on them.
 */

/** Monotonic, human-readable, e.g. `2026.07.28-1`. */
export type ContentVersion = Brand<string, 'ContentVersion'>;

/** Version of the deterministic battle rules. Separate from content: rules and numbers change independently. */
export type BattleEngineVersion = Brand<string, 'BattleEngineVersion'>;

/**
 * Stamped onto any persisted outcome that was computed from versioned inputs.
 * Present on battle results, expedition results, crafting results and reward grants.
 */
export interface ContentStamped {
  readonly contentVersion: ContentVersion;
}
