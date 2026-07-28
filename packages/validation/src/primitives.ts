import { z } from 'zod';
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, SUPPORTED_LOCALES } from '@collection-war/shared-types';

/**
 * Reusable schemas for the shared-kernel types. Defining them once means a UUID is
 * validated identically in the API, in a worker and in the admin app — including the
 * error message a player eventually sees.
 */

/** Matches any RFC-4122 UUID. Version 7 is what we mint, but v4 rows may exist from tooling. */
export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Must be a valid UUID',
  );

export const isoTimestampSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/,
    'Must be an ISO-8601 UTC timestamp ending in Z',
  );

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be an ISO-8601 date (YYYY-MM-DD)');

export const localeSchema = z.enum(SUPPORTED_LOCALES);

/**
 * Currency amounts are integers in minor units. `.int()` here is not a stylistic
 * preference — accepting `1.5` gems would let a rounding difference between two services
 * create or destroy value. See docs/constitution/ECONOMY_INTEGRITY_RULES.md.
 */
export const minorUnitsSchema = z
  .number()
  .int('Currency amounts must be whole minor units, never fractional')
  .finite();

/** A balance can never be negative. A ledger *delta* can — use `minorUnitsSchema` for those. */
export const nonNegativeMinorUnitsSchema = minorUnitsSchema.min(0, 'A balance cannot be negative');

/**
 * Idempotency keys are client-generated, so they are attacker-controlled. Bounding the
 * length and character set stops them being used as a storage-abuse or injection vector.
 */
export const idempotencyKeySchema = z
  .string()
  .min(16, 'Idempotency key is too short to be collision-resistant')
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'Idempotency key must be URL-safe');

export const correlationIdSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

/**
 * Cursor pagination input. `limit` is clamped rather than rejected: a client asking for
 * 10,000 rows gets 100, which is friendlier than an error and still protects the database.
 */
export const cursorPageRequestSchema = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/** Free-text a player can type. Trimmed and bounded everywhere it appears. */
export const shortTextSchema = z.string().trim().min(1).max(120);
export const longTextSchema = z.string().trim().max(2000);

/**
 * Display names are shown to other players, so they are a moderation surface. This schema
 * covers only the structural rules; profanity and impersonation checks belong to the
 * moderation domain and cannot be expressed here.
 */
export const displayNameSchema = z
  .string()
  .trim()
  .min(3, 'Display name must be at least 3 characters')
  .max(24, 'Display name must be at most 24 characters')
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u, 'Display name contains unsupported characters');
