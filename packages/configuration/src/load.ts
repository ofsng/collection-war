import type { z } from 'zod';
import { parseOrThrow } from '@collection-war/validation';
import { apiConfigSchema, workerConfigSchema, type ApiConfig, type WorkerConfig } from './schema';

/**
 * Loads and validates configuration for a process.
 *
 * The failure mode is deliberate and total: an invalid environment throws before the
 * server binds a port. There is no partial start, no "degraded mode", no falling back to
 * a default connection string. A process that cannot be sure which database it is
 * talking to must not be allowed to write to one.
 */

/** Everything the loader needs, injected so it is testable without mutating `process.env`. */
export type EnvSource = Record<string, string | undefined>;

function load<TSchema extends z.ZodType>(schema: TSchema, env: EnvSource, label: string): z.output<TSchema> {
  try {
    return parseOrThrow(schema, env, label);
  } catch (error) {
    // Re-thrown with an explicit pointer to the fix. This message is the first thing a
    // developer sees when the stack will not start; it should tell them what to do.
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${detail}\n\n` +
        `  Fix: compare your .env against .env.example, then run \`pnpm check:env\`.\n` +
        `  Docs: docs/runbooks/LOCAL_DEVELOPMENT.md`,
    );
  }
}

export function loadApiConfig(env: EnvSource = process.env): ApiConfig {
  return load(apiConfigSchema, env, 'API configuration');
}

export function loadWorkerConfig(env: EnvSource = process.env): WorkerConfig {
  return load(workerConfigSchema, env, 'Worker configuration');
}

/**
 * Produces a version of the config that is safe to log or return from a diagnostic
 * endpoint.
 *
 * Redaction is by key pattern rather than by an allow-list of known secrets, because the
 * failure mode matters: a new secret added to the schema is redacted by default and only
 * exposed if someone deliberately renames it. The opposite default leaks on every
 * addition someone forgets.
 */
const SECRET_KEY_PATTERN = /(SECRET|PASSWORD|TOKEN|KEY|CREDENTIAL|DATABASE_URL|REDIS_URL)/i;

export function redactConfig<T extends Record<string, unknown>>(config: T): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    output[key] = SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : value;
  }

  return output;
}
