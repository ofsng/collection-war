import { Inject, Injectable } from '@nestjs/common';
import {
  checkDatabaseHealth,
  withTimeout,
  type DatabaseHandle,
  type DependencyHealth,
} from '@collection-war/database';
import type Redis from 'ioredis';
import { TOKENS } from '../tokens';

/**
 * Dependency health checks used by the readiness probe.
 *
 * Design rules, each of which exists because the opposite has caused a real outage
 * somewhere:
 *
 *   - EVERY CHECK IS BOUNDED. An unbounded check turns a slow dependency into a hung
 *     probe, and a hung probe means the orchestrator neither routes traffic nor restarts
 *     the instance.
 *   - CHECKS RUN IN PARALLEL. Sequential checks make the probe's latency the sum of its
 *     dependencies' latencies.
 *   - A FAILED CHECK IS A RESULT, NOT AN EXCEPTION. Readiness must always answer.
 */
@Injectable()
export class HealthService {
  private readonly startedAtMs = Date.now();

  constructor(
    @Inject(TOKENS.DATABASE) private readonly database: DatabaseHandle,
    @Inject(TOKENS.REDIS) private readonly redis: Redis,
  ) {}

  uptimeSeconds(): number {
    return (Date.now() - this.startedAtMs) / 1000;
  }

  async checkDependencies(): Promise<{ database: DependencyHealth; redis: DependencyHealth }> {
    const [database, redis] = await Promise.all([checkDatabaseHealth(this.database.db), this.checkRedis()]);

    return { database, redis };
  }

  private async checkRedis(): Promise<DependencyHealth> {
    const startedAt = Date.now();

    try {
      // A real round trip. Inspecting `redis.status` would report 'ready' from a client
      // whose connection has silently gone away.
      await withTimeout(this.redis.ping(), 2_000);

      return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }
}
