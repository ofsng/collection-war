import { z } from 'zod';

/**
 * The environment contract. Every variable in `.env.example` appears here, and every
 * variable here appears in `.env.example` — `pnpm check:env` enforces that both ways.
 */

const booleanFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const portSchema = z.coerce.number().int().min(1).max(65535);

const commaSeparatedList = z.string().transform((value) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
);

/**
 * A URL restricted to an explicit set of schemes, so a Redis URL cannot be pasted into
 * DATABASE_URL — a genuinely easy mistake when copying environment blocks between services.
 *
 * The schemes are listed rather than derived. PostgreSQL accepts both `postgres://` and
 * `postgresql://`, and Redis adds `rediss://` for TLS; pattern-guessing those relationships
 * produces a check that rejects valid URLs.
 */
function urlWithScheme(schemes: readonly string[], label: string) {
  return z.string().refine((value) => schemes.some((scheme) => value.startsWith(`${scheme}://`)), {
    message: `Must be a ${label} connection URL beginning with ${schemes.map((s) => `"${s}://"`).join(' or ')}`,
  });
}

/**
 * `NODE_ENV` tells the toolchain how to build. `COLLECTION_WAR_ENV` tells the application
 * which real environment's data it is touching. They are separate on purpose: a
 * production-mode build running against the staging database must not think it is
 * production, and a development build pointed at production data must be able to refuse.
 */
export const runtimeSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  COLLECTION_WAR_ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export const databaseSchema = z.object({
  // No default. A wrong-but-present connection string is far more dangerous than a
  // missing one, because it may silently point at another environment's data.
  DATABASE_URL: urlWithScheme(['postgres', 'postgresql'], 'PostgreSQL'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_SSL: booleanFromEnv.default(false),
});

export const redisSchema = z.object({
  REDIS_URL: urlWithScheme(['redis', 'rediss'], 'Redis'),
});

export const storageSchema = z.object({
  STORAGE_ENDPOINT: z.url(),
  STORAGE_REGION: z.string().min(1).default('us-east-1'),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  // MinIO needs path-style addressing; most cloud S3 endpoints prefer virtual-host style.
  STORAGE_FORCE_PATH_STYLE: booleanFromEnv.default(true),
});

export const mailSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: portSchema.default(1025),
  SMTP_SECURE: booleanFromEnv.default(false),
  MAIL_FROM: z.email(),
});

export const authSchema = z.object({
  /**
   * 32 characters is the floor, not the recommendation. A short signing key makes token
   * forgery tractable, and a forged token in this system is account takeover.
   */
  AUTH_JWT_SECRET: z.string().min(32, 'AUTH_JWT_SECRET must be at least 32 characters'),
  AUTH_ACCESS_TOKEN_TTL: z.coerce.number().int().min(60).max(3600).default(900),
  AUTH_REFRESH_TOKEN_TTL: z.coerce.number().int().min(3600).default(2_592_000),
});

export const apiSchema = z.object({
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: portSchema.default(4000),
  API_PUBLIC_URL: z.url(),
  // The default is the parsed OUTPUT (a list), not the raw env string — in Zod 4 a
  // default on a transforming pipe is applied after the transform.
  API_CORS_ORIGINS: commaSeparatedList.default(['http://localhost:3000']),
});

export const featureFlagSchema = z.object({
  FEATURE_MARKETPLACE_ENABLED: booleanFromEnv.default(false),
  /**
   * Defaults to false and must stay false until legal and payment compliance is complete.
   * See docs/constitution/ECONOMY_INTEGRITY_RULES.md and ADR-0023.
   */
  FEATURE_REAL_MONEY_WITHDRAWAL_ENABLED: booleanFromEnv.default(false),
});

/** Composite schema for the API process. */
export const apiConfigSchema = runtimeSchema
  .extend(apiSchema.shape)
  .extend(databaseSchema.shape)
  .extend(redisSchema.shape)
  .extend(authSchema.shape)
  .extend(featureFlagSchema.shape)
  .superRefine((config, ctx) => {
    // Cross-field rules that no single field can express on its own. These exist because
    // the dangerous configurations are combinations, not individual bad values.

    if (config.COLLECTION_WAR_ENV !== 'production') return;

    if (config.API_CORS_ORIGINS.includes('*')) {
      ctx.addIssue({
        code: 'custom',
        path: ['API_CORS_ORIGINS'],
        message: 'Wildcard CORS is not permitted in production',
      });
    }

    if (!config.DATABASE_SSL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_SSL'],
        message: 'Production database connections must use TLS',
      });
    }

    if (config.AUTH_JWT_SECRET.startsWith('replace-me')) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_JWT_SECRET'],
        message: 'The example placeholder secret must never be used outside local development',
      });
    }
  });

/** Composite schema for the worker process. Workers never serve HTTP, so no API section. */
export const workerConfigSchema = runtimeSchema
  .extend(databaseSchema.shape)
  .extend(redisSchema.shape)
  .extend(featureFlagSchema.shape);

export type ApiConfig = z.infer<typeof apiConfigSchema>;
export type WorkerConfig = z.infer<typeof workerConfigSchema>;
export type FeatureFlagConfig = z.infer<typeof featureFlagSchema>;
export type RuntimeConfig = z.infer<typeof runtimeSchema>;
