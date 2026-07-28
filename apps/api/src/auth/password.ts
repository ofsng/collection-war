import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Promisified scrypt.
 *
 * Written by hand because `promisify`'s typings do not cover the four-argument overload that
 * accepts options — and the options are the entire point: the default cost parameters are far
 * too low to be worth using.
 */
function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/**
 * Password hashing.
 *
 * scrypt from `node:crypto` — memory-hard, built in, no native dependency and no install
 * script. See ADR-0026 for why this rather than Argon2id, and for the migration path.
 *
 * The stored format is self-describing:
 *
 *     scrypt$16384$8$1$<base64url salt>$<base64url hash>
 *
 * Carrying the parameters with the hash means they can be raised over time without a flag
 * day, and the `scrypt$` prefix is what makes a future move to Argon2id a rehash-on-login
 * rather than a forced password reset for everyone.
 */

/** CPU/memory cost. 2^16 ≈ 64 MB per hash — a deliberate capacity decision, not a default. */
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELISATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Node's default `maxmem` is 32 MB, which is below what these parameters need. Without this
 * the hash throws — and the failure looks like a configuration bug rather than a memory limit.
 */
const MAX_MEMORY = 256 * 1024 * 1024;

export const MINIMUM_PASSWORD_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    // Length beats composition rules: it is what actually resists guessing, and it does not
    // push people towards `Passw0rd!`.
    throw new Error(`Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters`);
  }

  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISATION,
    maxmem: MAX_MEMORY,
  });

  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELISATION,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

/**
 * Verifies a password against a stored hash.
 *
 * Reads the parameters FROM the stored hash rather than from the constants above, so hashes
 * created under older parameters keep verifying after the cost is raised.
 *
 * Returns `false` for a malformed hash rather than throwing: a corrupt row must not become a
 * 500 that tells an attacker something interesting about that account.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, costRaw, blockRaw, parallelRaw, saltRaw, hashRaw] = parts;

  // Checked explicitly rather than asserted: a corrupt row must return false, not throw.
  // A 500 here would tell an attacker something interesting about that specific account.
  if (saltRaw === undefined || hashRaw === undefined) return false;

  const cost = Number(costRaw);
  const blockSize = Number(blockRaw);
  const parallelisation = Number(parallelRaw);

  if (!Number.isInteger(cost) || !Number.isInteger(blockSize) || !Number.isInteger(parallelisation)) {
    return false;
  }

  try {
    const salt = Buffer.from(saltRaw, 'base64url');
    const expected = Buffer.from(hashRaw, 'base64url');

    const actual = await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N: cost,
      r: blockSize,
      p: parallelisation,
      maxmem: MAX_MEMORY,
    });

    // Constant-time. A byte-by-byte comparison leaks how much of the hash matched, which is
    // enough to reconstruct it one byte at a time.
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Whether a stored hash was created with weaker parameters than current policy.
 *
 * The hook for rehash-on-login: verify with the old parameters, then transparently re-store
 * with the new ones. Nobody has to reset a password because the cost was raised.
 */
export function needsRehash(storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return true;

  return Number(parts[1]) < COST;
}
