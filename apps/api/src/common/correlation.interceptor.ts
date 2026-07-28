import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { CORRELATION_ID_HEADER, resolveCorrelationId } from '@collection-war/observability';
import type { Observable } from 'rxjs';

/**
 * Assigns a correlation id to every request and echoes it back in the response.
 *
 * Echoing it matters: when a player reports a problem, the id they can read off a support
 * screen is the same id that appears in the server logs. Without that, support debugging
 * starts with guessing which of thousands of requests was theirs.
 *
 * The incoming header is adopted when it is well-formed and replaced when it is not —
 * `resolveCorrelationId` handles that. It is never trusted blindly, because it is echoed
 * into logs and would otherwise be a log-injection vector.
 */
@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const response = http.getResponse<{ header(name: string, value: string): void }>();

    const correlationId = resolveCorrelationId(request.headers[CORRELATION_ID_HEADER]);

    // Stash it on the request so downstream handlers and the exception filter can attach
    // it to whatever they emit.
    (request as unknown as Record<string, unknown>).correlationId = correlationId;
    response.header(CORRELATION_ID_HEADER, correlationId);

    return next.handle();
  }
}
