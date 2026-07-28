/**
 * Log redaction.
 *
 * Every incident review of a leaked credential ends the same way: nobody meant to log it.
 * A request body was logged wholesale, or an error object carried a config value, or a
 * debug line survived a merge.
 *
 * The defence is to redact by KEY PATTERN, deny-by-default, at the logger itself — so a
 * new secret is protected the moment it exists, without anyone remembering to add it.
 */

/**
 * Paths pino redacts automatically. Broad on purpose: a false positive costs one
 * unreadable log line, a false negative costs a credential rotation.
 */
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["x-refresh-token"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.apiKey',
  '*.authorization',
  '*.creditCard',
  '*.cardNumber',
  '*.cvv',
  '*.iban',
  'config.AUTH_JWT_SECRET',
  'config.DATABASE_URL',
  'config.REDIS_URL',
  'config.STORAGE_SECRET_ACCESS_KEY',
] as const;

export const REDACTION_PLACEHOLDER = '[REDACTED]';

/** Key names that must never appear in a log payload, whatever their nesting depth. */
const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|token|authorization|api[-_]?key|credential|cookie|session[-_]?id|card[-_]?number|cvv|iban|ssn)/i;

/**
 * Recursively redacts a plain object before it is logged.
 *
 * Use this for payloads assembled by hand. Structured request/response logging is already
 * covered by `REDACTED_PATHS` in the pino configuration; this is for everything else.
 */
export function redactDeep<T>(value: T, depth = 0): unknown {
  // Bounded depth: a cyclic or pathological structure must not be able to hang a
  // logging call, which would take the request down with it.
  if (depth > 8) return '[TRUNCATED]';

  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((entry) => redactDeep(entry, depth + 1));
  }

  const output: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTION_PLACEHOLDER : redactDeep(entry, depth + 1);
  }

  return output;
}

/**
 * Masks a connection string so it stays useful for diagnosis without disclosing the
 * password: `postgresql://user:pw@host:5432/db` becomes `postgresql://user:***@host:5432/db`.
 */
export function maskConnectionString(value: string): string {
  return value.replace(/^([a-z+]+:\/\/)([^:@/]+):([^@]*)@/i, `$1$2:${REDACTION_PLACEHOLDER}@`);
}
