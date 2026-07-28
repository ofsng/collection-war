import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadApiConfig, redactConfig } from '@collection-war/configuration';
import { createLogger } from '@collection-war/observability';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

/**
 * API entry point.
 *
 * The ordering below is deliberate and is the reason this file is not a one-liner:
 *
 *   1. CONFIGURATION IS VALIDATED FIRST, before anything else is constructed. If the
 *      environment is wrong, the process dies here with a readable message rather than
 *      binding a port and failing on the first player request.
 *   2. Security headers are registered before routes exist, so no route can be served
 *      without them.
 *   3. Shutdown hooks are enabled before listening, so a signal arriving one millisecond
 *      after startup is still handled gracefully.
 */
async function bootstrap(): Promise<void> {
  // Step 1. Nothing below this line runs against an invalid environment.
  const config = loadApiConfig();

  const logger = createLogger({
    level: config.LOG_LEVEL,
    service: 'collection-war-api',
    environment: config.COLLECTION_WAR_ENV,
    pretty: config.COLLECTION_WAR_ENV === 'local',
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forConfig(config),
    new FastifyAdapter({
      // Fastify generates its own request ids; we use the correlation id instead so that
      // a client-visible identifier matches what appears in the logs.
      genReqId: () => crypto.randomUUID(),
      trustProxy: config.COLLECTION_WAR_ENV !== 'local',
      bodyLimit: 1_048_576, // 1 MiB. An unbounded body is a trivial memory-exhaustion vector.
    }),
    { bufferLogs: true },
  );

  // Step 2. Security headers.
  await app.register(helmet, {
    // The API returns JSON, never HTML, so a restrictive CSP costs nothing and closes off
    // the class of attacks that rely on a browser rendering an API response.
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  app.enableCors({
    origin: config.API_CORS_ORIGINS,
    credentials: true,
    // Idempotency-Key and X-Correlation-Id are sent by our own clients and must be
    // explicitly allowed, or the browser will strip them on cross-origin requests.
    allowedHeaders: [
      'content-type',
      'authorization',
      'accept-language',
      'idempotency-key',
      'x-correlation-id',
    ],
  });

  /**
   * URI versioning is not enabled here because the version is already part of every
   * route path (`/api/v1/...`). Health and readiness deliberately sit OUTSIDE the
   * versioned namespace: an orchestrator's probe must not break when the API version
   * changes.
   */

  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // OpenAPI is generated for every environment, but only SERVED outside production.
  // The schema is a precise map of the attack surface; publishing it is a gift.
  const openApiDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Collection War API')
      .setDescription('Authoritative backend for Collection War. Platform endpoints only — no gameplay yet.')
      .setVersion('0.0.0')
      .addBearerAuth()
      .build(),
  );

  if (config.COLLECTION_WAR_ENV !== 'production') {
    SwaggerModule.setup('docs', app, openApiDocument);
  }

  // Step 3. Graceful shutdown: finish in-flight requests, then close pools and queues.
  // Without this, a deploy can abort a transaction mid-write.
  app.enableShutdownHooks();

  await app.listen({ port: config.API_PORT, host: config.API_HOST });

  logger.info(
    {
      port: config.API_PORT,
      host: config.API_HOST,
      environment: config.COLLECTION_WAR_ENV,
      // Redacted: this line is the single most likely place for a secret to reach a log
      // aggregator, because "log the config at startup" looks harmless.
      config: redactConfig(config),
    },
    'collection war api started',
  );
}

bootstrap().catch((error: unknown) => {
  // The logger may not exist yet if configuration failed, so this uses console directly.
  // It is the one sanctioned use in the codebase.
  console.error('\n✖ Collection War API failed to start:\n');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
