import { describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { HealthService } from './health.service';

function fakeHealthService(overrides: Partial<HealthService> = {}): HealthService {
  return {
    uptimeSeconds: () => 12.5,
    checkDependencies: async () => ({
      database: { status: 'up' as const, latencyMs: 3 },
      redis: { status: 'up' as const, latencyMs: 1 },
    }),
    ...overrides,
  } as HealthService;
}

describe('GET /health (liveness)', () => {
  it('reports ok with an uptime and a UTC timestamp', () => {
    const body = new HealthController(fakeHealthService()).liveness();

    expect(body.status).toBe('ok');
    expect(body.uptimeSeconds).toBeGreaterThan(0);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('does not consult any dependency', async () => {
    // The property that stops a database outage from becoming a restart loop: liveness
    // must stay green while dependencies are down.
    const checkDependencies = vi.fn();
    const controller = new HealthController(fakeHealthService({ checkDependencies }));

    controller.liveness();

    expect(checkDependencies).not.toHaveBeenCalled();
  });
});

describe('GET /ready (readiness)', () => {
  it('returns 200 and "ready" when every dependency is up', async () => {
    const status = vi.fn();
    const body = await new HealthController(fakeHealthService()).readiness({ status });

    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(body.status).toBe('ready');
    expect(body.dependencies.database.status).toBe('up');
  });

  it('returns 503 when a dependency is down', async () => {
    // Status code, not just a body flag — load balancers read the code and ignore the body.
    const status = vi.fn();
    const service = fakeHealthService({
      checkDependencies: async () => ({
        database: { status: 'down' as const, latencyMs: 2000, error: 'connection refused' },
        redis: { status: 'up' as const, latencyMs: 1 },
      }),
    });

    const body = await new HealthController(service).readiness({ status });

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(body.status).toBe('degraded');
  });

  it('returns 503 when Redis alone is down', async () => {
    const status = vi.fn();
    const service = fakeHealthService({
      checkDependencies: async () => ({
        database: { status: 'up' as const, latencyMs: 2 },
        redis: { status: 'down' as const, latencyMs: 2000 },
      }),
    });

    await new HealthController(service).readiness({ status });

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('still answers when a dependency check is slow, rather than hanging', async () => {
    // The probe must always produce an answer; HealthService bounds each check.
    const status = vi.fn();
    const service = fakeHealthService({
      checkDependencies: async () => ({
        database: { status: 'down' as const, latencyMs: 2000, error: 'Timed out after 2000ms' },
        redis: { status: 'up' as const, latencyMs: 1 },
      }),
    });

    await expect(new HealthController(service).readiness({ status })).resolves.toBeDefined();
  });
});
