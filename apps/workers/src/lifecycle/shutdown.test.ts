import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSilentLogger } from '@collection-war/observability';
import { registerShutdown } from './shutdown';

/**
 * Shutdown handling is registered on `process`, so each test cleans up its listeners.
 * Leaving them attached leaks handlers into later tests and, with enough tests, trips
 * Node's max-listeners warning.
 */
const SIGNALS = ['SIGTERM', 'SIGINT', 'unhandledRejection', 'uncaughtException'] as const;

afterEach(() => {
  for (const signal of SIGNALS) process.removeAllListeners(signal);
  vi.restoreAllMocks();
});

describe('registerShutdown', () => {
  it('runs cleanup and exits zero on SIGTERM', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const cleanup = vi.fn(async () => undefined);

    registerShutdown(createSilentLogger(), cleanup);
    process.emit('SIGTERM');

    await vi.waitFor(() => expect(cleanup).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
  });

  it('runs cleanup only once when the signal repeats', async () => {
    // A developer pressing Ctrl-C twice must not start a second cleanup pass over
    // resources the first pass is already closing.
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const cleanup = vi.fn(async () => undefined);

    registerShutdown(createSilentLogger(), cleanup);
    process.emit('SIGTERM');
    process.emit('SIGTERM');
    process.emit('SIGINT');

    await vi.waitFor(() => expect(cleanup).toHaveBeenCalledTimes(1));
  });

  it('exits non-zero when cleanup fails, so an orchestrator sees the failure', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    registerShutdown(createSilentLogger(), async () => {
      throw new Error('could not close the queue');
    });
    process.emit('SIGTERM');

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
  });

  it('shuts down on an unhandled rejection rather than continuing in an unknown state', async () => {
    // Continuing to process jobs that move currency from an unknown state is worse than
    // restarting.
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const cleanup = vi.fn(async () => undefined);

    registerShutdown(createSilentLogger(), cleanup);
    process.emit('unhandledRejection', new Error('lost promise'), Promise.resolve());

    await vi.waitFor(() => expect(cleanup).toHaveBeenCalledOnce());
  });

  it('shuts down on an uncaught exception', async () => {
    vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const cleanup = vi.fn(async () => undefined);

    registerShutdown(createSilentLogger(), cleanup);
    process.emit('uncaughtException', new Error('boom'));

    await vi.waitFor(() => expect(cleanup).toHaveBeenCalledOnce());
  });
});
