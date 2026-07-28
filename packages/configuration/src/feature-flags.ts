import type { FeatureFlagConfig } from './schema';

/**
 * Feature flags.
 *
 * At this stage flags come from the environment: they are deployment-time switches, not
 * per-player experiments. A remote flag service is deliberately deferred
 * (docs/status/DEFERRED_WORK.md) — the extra dependency buys nothing until there are
 * players to segment.
 *
 * The flags below are not conveniences. `realMoneyWithdrawal` is a legal boundary: while
 * it is off, no code path may create a withdrawable balance. See ADR-0023 and
 * docs/constitution/ECONOMY_INTEGRITY_RULES.md.
 */

export interface FeatureFlags {
  readonly marketplaceEnabled: boolean;
  readonly realMoneyWithdrawalEnabled: boolean;
}

export function toFeatureFlags(config: FeatureFlagConfig): FeatureFlags {
  return {
    marketplaceEnabled: config.FEATURE_MARKETPLACE_ENABLED,
    realMoneyWithdrawalEnabled: config.FEATURE_REAL_MONEY_WITHDRAWAL_ENABLED,
  };
}

/**
 * The safe state for every flag.
 *
 * Used when flag resolution fails. A flag system that fails OPEN turns an outage into an
 * unauthorised feature release; failing closed only turns it into a disabled feature.
 */
export const SAFE_DEFAULT_FLAGS: FeatureFlags = {
  marketplaceEnabled: false,
  realMoneyWithdrawalEnabled: false,
};
