import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import type { z } from 'zod';
import { toFieldIssues } from '@collection-war/validation';
import type { AppErrorCategory, Result } from '@collection-war/shared-types';

/**
 * Transport helpers shared by every controller.
 *
 * They exist so that validation and error mapping happen **identically** on every endpoint,
 * rather than being re-implemented per handler with slightly different behaviour each time.
 */

/**
 * Parses a request body against a schema.
 *
 * The error carries the failing field PATHS and never the submitted values — echoing a
 * rejected payload is how passwords and tokens reach logs and error trackers.
 */
export function parseBody<TSchema extends z.ZodType>(schema: TSchema, body: unknown): z.output<TSchema> {
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestException({
      message: 'Validation failed',
      issues: toFieldIssues(parsed.error),
    });
  }

  return parsed.data;
}

/** Maps the domain's error categories onto HTTP status codes. */
const STATUS_BY_CATEGORY: Record<AppErrorCategory, number> = {
  VALIDATION: HttpStatus.BAD_REQUEST,
  AUTHENTICATION: HttpStatus.UNAUTHORIZED,
  AUTHORIZATION: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  RATE_LIMIT: HttpStatus.TOO_MANY_REQUESTS,
  PRECONDITION_FAILED: HttpStatus.UNPROCESSABLE_ENTITY,
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
  UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
};

/**
 * Unwraps a `Result`, converting a failure into the right HTTP status.
 *
 * Services return `Result` because "not enough experience" is an ordinary outcome the caller
 * must handle, not an exception. This is the single place that turns one into a response, so
 * the mapping cannot drift between endpoints.
 */
export function unwrapOrThrow<T>(result: Result<T>): T {
  if (result.ok) return result.value;

  const { category, code, message, messageKey, details } = result.error;

  throw new HttpException(
    {
      error: {
        category,
        code,
        message,
        ...(messageKey ? { messageKey } : {}),
        ...(details ? { details } : {}),
      },
    },
    STATUS_BY_CATEGORY[category] ?? HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
