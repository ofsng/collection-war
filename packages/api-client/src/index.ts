/**
 * Collection War — API client.
 *
 * The single sanctioned path from a client application to the server. Web, admin and
 * mobile all use it; none of them constructs a `fetch` to the API by hand.
 *
 * Centralising this is what makes the following consistent everywhere rather than
 * re-implemented (differently, and with different bugs) in three applications:
 *   - correlation-id propagation
 *   - the one error shape
 *   - idempotency keys on unsafe writes
 *   - timeouts and cancellation
 *   - authentication token attachment
 *   - response validation
 *
 * The client NEVER decides anything. It transports requests and parses responses. Any
 * logic that determines a reward, a balance, an outcome or an ownership change lives on
 * the server — see docs/constitution/SECURITY_RULES.md#server-authority.
 */

export * from './client';
export * from './types';
export * from './system';
export * from './game';
