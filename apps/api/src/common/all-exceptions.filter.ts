import { Catch, HttpException, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import {
  APP_ERROR_CODES,
  type ApiErrorResponse,
  type AppErrorCategory,
  type AppErrorCode,
  type CorrelationId,
} from '@collection-war/shared-types';
import type { Logger } from '@collection-war/observability';

/**
 * Turns every uncaught error into the single API error shape.
 *
 * The rule this enforces — and the reason it is a filter rather than a convention — is
 * that INTERNAL DETAIL NEVER REACHES A CLIENT. A stack trace tells an attacker the
 * framework, the file layout and often the query that failed. A database error message
 * can contain column names and sometimes values.
 *
 * So: the full error goes to the log, and the client gets a stable code plus the
 * correlation id that ties the two together.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<{ url?: string; method?: string; correlationId?: CorrelationId }>();
    const response = http.getResponse<{ status(code: number): { send(body: unknown): void } }>();

    const correlationId = request.correlationId;
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Server-side: everything, including the stack.
    const logPayload = {
      correlationId,
      method: request.method,
      url: request.url,
      status,
      error: exception instanceof Error ? { name: exception.name, message: exception.message } : exception,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    if (status >= 500) {
      this.logger.error(logPayload, 'unhandled request error');
    } else {
      this.logger.warn(logPayload, 'request rejected');
    }

    // Client-side: only what is safe.
    const body: ApiErrorResponse = {
      error: {
        category: categoryFor(status),
        code: codeFor(status),
        message: status >= 500 ? 'An unexpected error occurred' : safeClientMessage(exception, status),
        ...(correlationId ? { correlationId } : {}),
      },
    };

    response.status(status).send(body);
  }
}

function categoryFor(status: number): AppErrorCategory {
  if (status === 400) return 'VALIDATION';
  if (status === 401) return 'AUTHENTICATION';
  if (status === 403) return 'AUTHORIZATION';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMIT';
  if (status >= 500) return 'INTERNAL';
  return 'VALIDATION';
}

function codeFor(status: number): AppErrorCode {
  if (status === 401) return APP_ERROR_CODES.UNAUTHENTICATED;
  if (status === 403) return APP_ERROR_CODES.FORBIDDEN;
  if (status === 404) return APP_ERROR_CODES.RESOURCE_NOT_FOUND;
  if (status === 409) return APP_ERROR_CODES.RESOURCE_CONFLICT;
  if (status === 429) return APP_ERROR_CODES.RATE_LIMITED;
  if (status === 400) return APP_ERROR_CODES.VALIDATION_FAILED;
  return APP_ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Extracts a client-safe message from a deliberate `HttpException`.
 *
 * Only messages the application itself chose to raise are passed through. Anything else
 * gets a generic string, because an error raised by a library was not written with a
 * player audience in mind.
 */
function safeClientMessage(exception: unknown, status: number): string {
  if (exception instanceof HttpException) {
    const payload = exception.getResponse();
    if (typeof payload === 'string') return payload;
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const message = (payload as { message: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join('; ');
    }
  }

  return `Request failed with status ${status}`;
}
