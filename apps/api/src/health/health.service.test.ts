import { describe, expect, it, vi } from 'vitest';
import type { DatabaseHandle } from '@collection-war/database';
import type Redis from 'ioredis';
import { HealthService } from './health.service';

function fakeDatabase(execute: () => Promise<unknown>): DatabaseHandle {
  return { db: { execute }, pool: {}, close: async () => undefined } as unknown as DatabaseHandle;
}

function fakeRedis(ping: () => Promise<string>): Redis {
  return { ping } as unknown as Redis;
}

describe('HealthService', () => {
  it('reports both dependencies up when both respond', async () => {
    const service = new HealthService(
      fakeDatabase(async () => ({ rows: [] })),
      fakeRedis(async () => 'PONG'),
    );

    const result = await service.checkDependencies();

    expect(result.database.status).toBe('up');
    expect(result.redis.status).toBe('up');
  });

  it('reports one dependency down without hiding the other', async () => {
    const service = new HealthService(
      fakeDatabase(async () => ({ rows: [] })),
      fakeRedis(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );

    const result = await service.checkDependencies();

    expect(result.database.status).toBe('up');
    expect(result.redis.status).toBe('down');
    expect(result.redis.error).toBe('ECONNREFUSED');
  });

  it('checks dependencies in parallel, not one after another', async () => {
    // Sequential checks make the probe's latency the sum of every dependency's latency,
    // which is how a readiness probe starts timing out under mild load.
    const started: number[] = [];
    const slow = async () => {
      started.push(Date.now());
      await new Promise((resolve) => setTimeout(resolve, 40));
      return 'PONG';
    };

    const service = new HealthService(
      fakeDatabase(async () => {
        started.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 40));
        return { rows: [] };
      }),
      fakeRedis(slow),
    );

    const begunAt = Date.now();
    await service.checkDependencies();
    const elapsed = Date.now() - begunAt;

    // Two 40ms checks in parallel finish well under their 80ms sequential sum.
    expect(elapsed).toBeLessThan(75);
  });

  it('bounds a hanging Redis check instead of waiting forever', async () => {
    const service = new HealthService(
      fakeDatabase(async () => ({ rows: [] })),
      fakeRedis(() => new Promise(() => undefined)),
    );

    const result = await service.checkDependencies();

    expect(result.redis.status).toBe('down');
    expect(result.redis.error).toMatch(/Timed out/);
  }, 10_000);

  it('measures uptime from construction', () => {
    const service = new HealthService(
      fakeDatabase(async () => ({})),
      fakeRedis(async () => 'PONG'),
    );

    expect(service.uptimeSeconds()).toBeGreaterThanOrEqual(0);
    expect(service.uptimeSeconds()).toBeLessThan(1);
  });

  it('does not leak Redis connection details into the error', async () => {
    const redisError = Object.assign(new Error('connect ECONNREFUSED'), {
      address: '10.0.0.5',
      port: 6379,
    });
    const service = new HealthService(
      fakeDatabase(async () => ({})),
      fakeRedis(async () => {
        throw redisError;
      }),
    );

    const result = await service.checkDependencies();

    expect(JSON.stringify(result)).not.toContain('10.0.0.5');
  });

  it('never throws, so readiness always answers', async () => {
    const service = new HealthService(
      fakeDatabase(async () => {
        throw new Error('down');
      }),
      fakeRedis(async () => {
        throw new Error('down');
      }),
    );

    await expect(service.checkDependencies()).resolves.toBeDefined();
  });

  it('surfaces a mocked slow check as measurable latency', async () => {
    const ping = vi.fn(async () => 'PONG');
    const service = new HealthService(
      fakeDatabase(async () => ({})),
      fakeRedis(ping),
    );

    const result = await service.checkDependencies();

    expect(ping).toHaveBeenCalledOnce();
    expect(result.redis.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
