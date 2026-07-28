import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Access and refresh tokens.
 *
 * Access tokens are signed, stateless and short-lived. Refresh tokens are opaque random
 * strings stored **hashed**, so a database leak does not hand an attacker a set of working
 * sessions.
 *
 * A minimal HMAC-signed token rather than a JWT library: the payload is three fields, the
 * algorithm is fixed, and a fixed algorithm removes the `alg: none` and algorithm-confusion
 * classes of vulnerability by construction. If claims ever need to be richer, `jose` is the
 * upgrade — recorded as deferred work rather than pre-emptively added.
 */

export interface AccessTokenPayload {
  /** Subject — the user id. */
  readonly sub: string;
  /** The player profile id, so most endpoints need no extra lookup. */
  readonly pid: string;
  /** Expiry, epoch seconds. */
  readonly exp: number;
}

function base64url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createAccessToken(
  payload: Omit<AccessTokenPayload, 'exp'>,
  secret: string,
  ttlSeconds: number,
  nowMs: number,
): string {
  const full: AccessTokenPayload = {
    ...payload,
    exp: Math.floor(nowMs / 1000) + ttlSeconds,
  };

  const body = base64url(JSON.stringify(full));
  return `${body}.${sign(body, secret)}`;
}

/**
 * Verifies and decodes an access token.
 *
 * Returns `null` for anything invalid — bad signature, expired, malformed. The caller turns
 * that into a 401 without distinguishing the cases, because the difference between "expired"
 * and "forged" is not information an unauthenticated caller needs.
 */
export function verifyAccessToken(token: string, secret: string, nowMs: number): AccessTokenPayload | null {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = Buffer.from(sign(body, secret));
  const actual = Buffer.from(signature);

  // Constant-time, and length-checked first because timingSafeEqual throws on a mismatch.
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AccessTokenPayload;

    if (typeof payload.sub !== 'string' || typeof payload.pid !== 'string') return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Creates an opaque refresh token and the hash to store.
 *
 * 32 random bytes — not derived from anything, so it carries no information and cannot be
 * forged. SHA-256 is correct here rather than scrypt: the input is already high-entropy
 * random, so there is nothing to brute-force and no reason to pay a memory-hard cost on
 * every refresh.
 */
export function createRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}
