// Type-only: this module never constructs a schema, it only accepts and inspects them.
import type { z } from 'zod';
import { APP_ERROR_CODES, err, ok, type AppErrorShape, type Result } from '@collection-war/shared-types';

/**
 * Bridges Zod failures into the one error shape the whole system uses, so a validation
 * failure looks identical whether it happened in an HTTP handler, a queue consumer or a
 * config loader.
 */

export interface FieldIssue {
  readonly path: string;
  readonly message: string;
}

export function toFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
    message: issue.message,
  }));
}

/**
 * Parses `input` and returns a `Result` instead of throwing.
 *
 * Note what is NOT in the returned error: the input itself. Echoing a rejected payload
 * back to the caller is how passwords and tokens end up in logs and error trackers.
 * Only the path and the rule that failed are disclosed.
 */
export function parseWith<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): Result<z.output<TSchema>, AppErrorShape> {
  const result = schema.safeParse(input);

  if (result.success) {
    return ok(result.data);
  }

  return err({
    category: 'VALIDATION',
    code: APP_ERROR_CODES.VALIDATION_FAILED,
    message: 'Input failed schema validation',
    details: { issues: toFieldIssues(result.error) },
  });
}

/**
 * Parses or throws. Reserved for startup-time configuration, where there is no caller to
 * return a `Result` to and continuing with invalid config is worse than crashing.
 */
export function parseOrThrow<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
  context: string,
): z.output<TSchema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const issues = toFieldIssues(result.error)
      .map((issue) => `  - ${issue.path}: ${issue.message}`)
      .join('\n');
    throw new Error(`${context} is invalid:\n${issues}`);
  }

  return result.data;
}
