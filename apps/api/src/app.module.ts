import { Module, type DynamicModule } from '@nestjs/common';
import { type ApiConfig } from '@collection-war/configuration';
import { createLogger } from '@collection-war/observability';
import { createSystemClock } from '@collection-war/domain';
import { createDatabase, type DatabaseHandle } from '@collection-war/database';
import Redis from 'ioredis';
import { TOKENS } from './tokens';
import { HealthController } from './health/health.controller';
import { SystemController } from './system/system.controller';
import { HealthService } from './health/health.service';
import { CorrelationInterceptor } from './common/correlation.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

/**
 * The application module.
 *
 * `forConfig` takes the already-validated configuration rather than reading `process.env`
 * itself. That keeps the module constructible in a test with an arbitrary configuration,
 * and it means there is exactly one place in the process where the environment is read.
 *
 * MODULE STRUCTURE NOTE: this is a modular monolith. Each future domain becomes its own
 * Nest module with its own controllers and services, importing only what its boundary
 * allows (docs/architecture/MODULE_BOUNDARIES.md). At bootstrap the only modules are
 * platform concerns — health and system info — because no domain has been specified yet.
 */
@Module({})
export class AppModule {
  static forConfig(config: ApiConfig): DynamicModule {
    const logger = createLogger({
      level: config.LOG_LEVEL,
      service: 'collection-war-api',
      environment: config.COLLECTION_WAR_ENV,
      pretty: config.COLLECTION_WAR_ENV === 'local',
    });

    return {
      module: AppModule,
      controllers: [HealthController, SystemController],
      providers: [
        { provide: TOKENS.CONFIG, useValue: config },
        { provide: TOKENS.LOGGER, useValue: logger },
        { provide: TOKENS.CLOCK, useValue: createSystemClock() },

        {
          provide: TOKENS.DATABASE,
          useFactory: (): DatabaseHandle =>
            createDatabase({
              connectionString: config.DATABASE_URL,
              maxConnections: config.DATABASE_POOL_MAX,
              ssl: config.DATABASE_SSL,
            }),
        },

        {
          provide: TOKENS.REDIS,
          useFactory: (): Redis =>
            new Redis(config.REDIS_URL, {
              // Do NOT retry forever on startup. A Redis that is down should make
              // readiness fail loudly, not make every request hang while ioredis retries
              // in the background.
              maxRetriesPerRequest: 2,
              enableOfflineQueue: false,
              lazyConnect: false,
              retryStrategy: (times) => Math.min(times * 200, 5_000),
            }),
        },

        HealthService,

        // Applied to every request: assigns or adopts a correlation id.
        { provide: APP_INTERCEPTOR, useClass: CorrelationInterceptor },
      ],
    };
  }
}
