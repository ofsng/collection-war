import { Module, type DynamicModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import { GameController } from './game/game.controller';
import { ContentService } from './game/content.service';
import { CreaturesService } from './game/creatures.service';
import { TeamsService } from './game/teams.service';
import { PveService } from './game/pve.service';
import { InventoryService } from './game/inventory.service';
import { ProfileService } from './game/profile.service';

/**
 * The application module.
 *
 * `forConfig` takes already-validated configuration rather than reading `process.env` itself,
 * so the module is constructible in a test with any configuration and there is exactly one
 * place in the process where the environment is read.
 *
 * MODULE STRUCTURE: this is a modular monolith. Game services are grouped under `game/` and
 * depend on each other through their public methods — never by reaching into another
 * module's tables. See docs/architecture/GAME_STATE_OWNERSHIP.md.
 */
@Module({})
export class AppModule {
  static forConfig(config: ApiConfig, databaseOverride?: DatabaseHandle): DynamicModule {
    const logger = createLogger({
      level: config.LOG_LEVEL,
      service: 'collection-war-api',
      environment: config.COLLECTION_WAR_ENV,
      pretty: config.COLLECTION_WAR_ENV === 'local',
    });

    return {
      module: AppModule,
      controllers: [HealthController, SystemController, AuthController, GameController],
      providers: [
        { provide: TOKENS.CONFIG, useValue: config },
        { provide: TOKENS.LOGGER, useValue: logger },
        { provide: TOKENS.CLOCK, useValue: createSystemClock() },

        {
          provide: TOKENS.DATABASE,
          // The override exists so integration tests can supply a PGlite-backed handle. The
          // production path is unchanged, and the tests exercise the same services and the
          // same SQL as production does.
          useFactory: (): DatabaseHandle =>
            databaseOverride ??
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
              // Do NOT retry forever on startup. A Redis that is down should make readiness
              // fail loudly, not make every request hang while ioredis retries in silence.
              maxRetriesPerRequest: 2,
              enableOfflineQueue: false,
              lazyConnect: false,
              retryStrategy: (times) => Math.min(times * 200, 5_000),
            }),
        },

        HealthService,
        AuthService,
        AuthGuard,

        ContentService,
        InventoryService,
        CreaturesService,
        TeamsService,
        PveService,
        ProfileService,

        // Applied to every request: assigns or adopts a correlation id.
        { provide: APP_INTERCEPTOR, useClass: CorrelationInterceptor },
      ],
    };
  }
}
