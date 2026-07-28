import { loadWorkerConfig } from '@collection-war/configuration';
import { createLogger } from '@collection-war/observability';
import { createQueueConnection } from './queue/connection';
import { registerShutdown } from './lifecycle/shutdown';
import { QUEUE_NAMES } from './queue/queues';

/**
 * Worker process entry point.
 *
 * Workers are a SEPARATE PROCESS from the API, not a background thread inside it. Three
 * reasons, all of which become expensive to retrofit:
 *   - A long-running job must not compete with request handling for the event loop.
 *   - Workers and API scale on different signals (queue depth vs. request rate).
 *   - A crashing job must not take down request serving.
 *
 * NO GAME JOBS ARE REGISTERED. Expedition completion, marketplace expiry, notification
 * delivery and outbox relay are all designed (docs/architecture/EVENT_ARCHITECTURE.md) and
 * none is implemented, because each depends on a domain that has not been specified.
 * What exists here is the process lifecycle: configuration, connection, health logging and
 * graceful shutdown.
 */
async function bootstrap(): Promise<void> {
  const config = loadWorkerConfig();

  const logger = createLogger({
    level: config.LOG_LEVEL,
    service: 'collection-war-workers',
    environment: config.COLLECTION_WAR_ENV,
    pretty: config.COLLECTION_WAR_ENV === 'local',
  });

  logger.info({ environment: config.COLLECTION_WAR_ENV }, 'collection war workers starting');

  const connection = createQueueConnection(config.REDIS_URL);

  // Fail fast and visibly. A worker that cannot reach Redis has nothing to do; it must not
  // sit in a silent retry loop looking healthy.
  connection.on('error', (error) => {
    logger.error({ error: error.message }, 'redis connection error');
  });

  await connection.ping();
  logger.info({ queues: QUEUE_NAMES }, 'redis reachable; queue foundation ready');

  logger.warn(
    { registeredProcessors: 0 },
    'no job processors are registered — this is expected during the platform bootstrap',
  );

  registerShutdown(logger, async () => {
    // Order matters: stop accepting new work before closing the connection that in-flight
    // work still needs.
    await connection.quit();
  });

  // Keep the process alive. Once real processors exist, BullMQ's workers hold the event
  // loop open and this becomes unnecessary.
  await new Promise<void>(() => undefined);
}

bootstrap().catch((error: unknown) => {
  console.error('\n✖ Collection War workers failed to start:\n');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
