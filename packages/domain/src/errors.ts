import {
  APP_ERROR_CODES,
  err,
  type AppErrorCategory,
  type AppErrorCode,
  type AppErrorShape,
  type Err,
} from '@collection-war/shared-types';

/**
 * Constructors for the error shapes domain code returns.
 *
 * These exist so that every "not enough gold" in the system is literally the same error —
 * same category, same code, same translation key — regardless of which module produced it.
 * A client can then handle it once.
 */

function make(
  category: AppErrorCategory,
  code: AppErrorCode,
  message: string,
  details?: Record<string, unknown>,
): Err<AppErrorShape> {
  return err({ category, code, message, ...(details ? { details } : {}) });
}

export const DomainErrors = {
  notFound(resource: string, id?: string) {
    // Deliberately does NOT distinguish "does not exist" from "exists but is not yours".
    // Doing so lets an attacker enumerate other players' resource ids.
    return make('NOT_FOUND', APP_ERROR_CODES.RESOURCE_NOT_FOUND, `${resource} not found`, { resource, id });
  },

  notOwner(resource: string) {
    return make('AUTHORIZATION', APP_ERROR_CODES.NOT_RESOURCE_OWNER, `Actor does not own this ${resource}`, {
      resource,
    });
  },

  forbidden(reason: string) {
    return make('AUTHORIZATION', APP_ERROR_CODES.FORBIDDEN, reason);
  },

  /**
   * Optimistic-concurrency failure: the row changed between read and write. The caller
   * must re-read and retry, never blindly overwrite.
   */
  staleWrite(resource: string, expectedVersion: number, actualVersion: number) {
    return make('CONFLICT', APP_ERROR_CODES.STALE_WRITE, `${resource} was modified concurrently`, {
      resource,
      expectedVersion,
      actualVersion,
    });
  },

  insufficientFunds(currency: string) {
    return make('PRECONDITION_FAILED', APP_ERROR_CODES.INSUFFICIENT_FUNDS, 'Insufficient balance', {
      currency,
    });
  },

  insufficientInventory(itemId: string, required: number, available: number) {
    return make('PRECONDITION_FAILED', APP_ERROR_CODES.INSUFFICIENT_INVENTORY, 'Insufficient inventory', {
      itemId,
      required,
      available,
    });
  },

  currencyKindMismatch(expected: string, received: string) {
    return make(
      'VALIDATION',
      APP_ERROR_CODES.CURRENCY_KIND_MISMATCH,
      'Currency kinds cannot be mixed in one operation',
      { expected, received },
    );
  },

  rewardAlreadyClaimed(rewardId: string) {
    return make('CONFLICT', APP_ERROR_CODES.REWARD_ALREADY_CLAIMED, 'Reward has already been claimed', {
      rewardId,
    });
  },

  featureDisabled(feature: string) {
    return make('PRECONDITION_FAILED', APP_ERROR_CODES.FEATURE_DISABLED, `Feature "${feature}" is disabled`, {
      feature,
    });
  },
} as const;
