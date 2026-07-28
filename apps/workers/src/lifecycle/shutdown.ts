import type { Logger } from '@collection-war/observability';

/**
 * Graceful shutdown.
 *
 * When a deploy sends SIGTERM, a worker in the middle of a job must finish it (or return
 * it to the queue) rather than being killed mid-write. Without this, a job that has
 * debited a player's gold but not yet credited their inventory can be terminated between
 * the two — which is exactly the state the transactional design exists to prevent.
 *
 * The forced-exit timer is not a nicety. If cleanup itself hangs, an orchestrator will
 * eventually SIGKILL the process anyway, and it is better to exit deliberately with a
 * logged reason than to be killed silently.
 */
const FORCED_EXIT_TIMEOUT_MS = 30_000;

export function registerShutdown(logger: Logger, cleanup: () => Promise<void>): void {
  let shuttingDown = false;

  const handle = (signal: string) => {
    // A second Ctrl-C during shutdown must not start a second cleanup pass.
    if (shuttingDown) {
      logger.warn({ signal }, 'shutdown already in progress; ignoring repeated signal');
      return;
    }
    shuttingDown = true;

    logger.info({ signal }, 'shutdown requested; finishing in-flight work');

    const forcedExit = setTimeout(() => {
      logger.error({ timeoutMs: FORCED_EXIT_TIMEOUT_MS }, 'graceful shutdown timed out; exiting forcibly');
      process.exit(1);
    }, FORCED_EXIT_TIMEOUT_MS);

    // Do not hold the process open just for the timer.
    forcedExit.unref();

    cleanup()
      .then(() => {
        clearTimeout(forcedExit);
        logger.info({ signal }, 'shutdown complete');
        process.exit(0);
      })
      .catch((error: unknown) => {
        clearTimeout(forcedExit);
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'shutdown failed');
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => handle('SIGTERM'));
  process.on('SIGINT', () => handle('SIGINT'));

  // An unhandled rejection leaves the process in an unknown state. Continuing to process
  // jobs that move currency from an unknown state is worse than restarting.
  process.on('unhandledRejection', (reason) => {
    logger.fatal(
      { reason: reason instanceof Error ? reason.message : String(reason) },
      'unhandled rejection',
    );
    handle('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ error: error.message, stack: error.stack }, 'uncaught exception');
    handle('uncaughtException');
  });
}
