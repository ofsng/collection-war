import type { CorrelationId } from './ids';
import type { TranslationKey } from './locale';

/**
 * One error shape for the entire system — see docs/architecture/API_ARCHITECTURE.md#error-format.
 *
 * Design constraints:
 *   - The `code` is machine-readable and stable. Clients branch on it, never on message text.
 *   - `messageKey` lets the client render the error in the player's own language. The
 *     server does not send a pre-translated sentence for ordinary errors.
 *   - `message` is developer-facing English for logs. It is NOT shown to players.
 *   - `details` never contains anything the caller is not already entitled to see. An
 *     authorization failure must not leak whether the resource exists.
 */

export type AppErrorCategory =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'PRECONDITION_FAILED'
  | 'INTERNAL'
  | 'UNAVAILABLE';

export const APP_ERROR_CODES = {
  // VALIDATION
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNSUPPORTED_LOCALE: 'UNSUPPORTED_LOCALE',

  // AUTHENTICATION / AUTHORIZATION
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_RESOURCE_OWNER: 'NOT_RESOURCE_OWNER',

  // RESOURCE
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  STALE_WRITE: 'STALE_WRITE',

  // ECONOMY — every one of these is a refusal to change a balance or ownership.
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
  CURRENCY_KIND_MISMATCH: 'CURRENCY_KIND_MISMATCH',
  DUPLICATE_IDEMPOTENCY_KEY: 'DUPLICATE_IDEMPOTENCY_KEY',
  REWARD_ALREADY_CLAIMED: 'REWARD_ALREADY_CLAIMED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',

  // INFRASTRUCTURE
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
} as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[keyof typeof APP_ERROR_CODES];

export interface AppErrorShape {
  readonly category: AppErrorCategory;
  readonly code: AppErrorCode;
  /** Developer-facing English. Logged, never rendered to a player. */
  readonly message: string;
  /** Client-side translation key for the player-facing message. */
  readonly messageKey?: TranslationKey;
  /** Safe-to-disclose context only, e.g. which field failed validation. */
  readonly details?: Readonly<Record<string, unknown>>;
  /** Ties the error to server logs so support can find the exact request. */
  readonly correlationId?: CorrelationId;
}

/** The exact JSON body every non-2xx API response carries. No endpoint invents its own. */
export interface ApiErrorResponse {
  readonly error: AppErrorShape;
}
