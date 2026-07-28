import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { CorrelationInterceptor } from './correlation.interceptor';

function invoke(headers: Record<string, string | string[] | undefined>) {
  const request: Record<string, unknown> = { headers };
  const header = vi.fn();

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ header }),
    }),
  };

  new CorrelationInterceptor().intercept(context as never, { handle: () => of(null) });

  return { request, header };
}

describe('CorrelationInterceptor', () => {
  it('adopts a well-formed incoming correlation id', () => {
    const { request } = invoke({ 'x-correlation-id': 'client-abc123456' });

    expect(request.correlationId).toBe('client-abc123456');
  });

  it('mints one when the header is absent', () => {
    const { request } = invoke({});

    expect(request.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('replaces a hostile header rather than echoing it into the logs', () => {
    // The id is written into log lines, so an unvalidated value is a log-injection vector.
    const { request } = invoke({ 'x-correlation-id': 'evil\n{"level":"fatal"}' });

    expect(String(request.correlationId)).not.toContain('\n');
  });

  it('echoes the id back on the response so support can quote it', () => {
    const { header } = invoke({ 'x-correlation-id': 'client-abc123456' });

    expect(header).toHaveBeenCalledWith('x-correlation-id', 'client-abc123456');
  });
});
