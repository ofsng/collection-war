import { describe, expect, it, vi } from 'vitest';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { createSilentLogger, type Logger } from '@collection-war/observability';
import { AllExceptionsFilter } from './all-exceptions.filter';

function invoke(exception: unknown, logger: Logger = createSilentLogger()) {
  const send = vi.fn();
  const status = vi.fn(() => ({ send }));

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url: '/api/v1/thing', method: 'GET', correlationId: 'corr-12345678' }),
      getResponse: () => ({ status }),
    }),
  };

  new AllExceptionsFilter(logger).catch(exception, host as never);

  return { status, send, body: send.mock.calls[0]?.[0] };
}

describe('AllExceptionsFilter', () => {
  it('maps an HttpException to its own status and a stable error code', () => {
    const { status, body } = invoke(new NotFoundException('Creature not found'));

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(body.error.category).toBe('NOT_FOUND');
  });

  it('maps an unknown throw to 500', () => {
    const { status, body } = invoke(new Error('something exploded in a library'));

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('never returns an internal message or a stack trace to the client', () => {
    // The central guarantee of this filter. A stack trace names the framework, the file
    // layout and often the failing query.
    const exception = new Error('SELECT * FROM players WHERE email = $1 failed: relation missing');
    const { body } = invoke(exception);

    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain('SELECT');
    expect(serialized).not.toContain('players');
    expect(serialized).not.toContain('relation missing');
    expect(body.error.message).toBe('An unexpected error occurred');
  });

  it('logs the full detail server-side, including the stack', () => {
    // The detail must not be lost — only withheld from the client.
    const logged: Array<Record<string, unknown>> = [];
    const logger: Logger = {
      ...createSilentLogger(),
      error: (context) => {
        logged.push(context);
      },
    };

    invoke(new Error('internal detail'), logger);

    expect(logged).toHaveLength(1);
    expect(JSON.stringify(logged[0])).toContain('internal detail');
    expect(logged[0]?.stack).toBeTruthy();
  });

  it('logs 4xx as a warning and 5xx as an error', () => {
    // A client sending a malformed request is not an incident; a 500 is.
    const warns: unknown[] = [];
    const errors: unknown[] = [];
    const logger: Logger = {
      ...createSilentLogger(),
      warn: (context) => void warns.push(context),
      error: (context) => void errors.push(context),
    };

    invoke(new NotFoundException('nope'), logger);
    expect(warns).toHaveLength(1);
    expect(errors).toHaveLength(0);

    invoke(new Error('boom'), logger);
    expect(errors).toHaveLength(1);
  });

  it('attaches the correlation id so a player report can be traced to a log line', () => {
    const { body } = invoke(new Error('boom'));

    expect(body.error.correlationId).toBe('corr-12345678');
  });

  it('passes through a deliberate 4xx message, since the application chose that wording', () => {
    const { body } = invoke(new HttpException('Listing already sold', HttpStatus.CONFLICT));

    expect(body.error.message).toBe('Listing already sold');
    expect(body.error.category).toBe('CONFLICT');
  });
});
