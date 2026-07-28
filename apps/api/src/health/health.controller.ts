import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { IsoTimestamp } from '@collection-war/shared-types';
import { HealthService } from './health.service';

/**
 * Liveness and readiness.
 *
 * These are two different questions and conflating them causes restart loops:
 *
 *   LIVENESS  `/health` — "is this process alive?" It touches NOTHING external. If it
 *             checked the database, a database outage would make every instance fail its
 *             liveness probe and be killed, turning a recoverable dependency failure into
 *             a total, self-inflicted outage.
 *
 *   READINESS `/ready` — "can this process serve traffic right now?" It DOES check
 *             dependencies, and returns 503 when they are down, so the load balancer stops
 *             routing to it while leaving the process running to recover.
 *
 * Both live outside `/api/v1` on purpose: an infrastructure probe must not break when the
 * API version changes.
 */
@ApiTags('system')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe. Never touches a dependency.' })
  @ApiResponse({ status: 200, description: 'The process is running.' })
  liveness() {
    return {
      status: 'ok' as const,
      uptimeSeconds: this.health.uptimeSeconds(),
      timestamp: new Date().toISOString() as IsoTimestamp,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe. Reports dependency health.' })
  @ApiResponse({ status: 200, description: 'Every dependency is reachable.' })
  @ApiResponse({ status: 503, description: 'At least one dependency is unreachable.' })
  async readiness(@Res({ passthrough: true }) response: { status(code: number): unknown }) {
    const dependencies = await this.health.checkDependencies();
    const ready = dependencies.database.status === 'up' && dependencies.redis.status === 'up';

    // 503 rather than 200-with-a-flag: load balancers and orchestrators read the STATUS
    // CODE. A body saying "degraded" behind a 200 is ignored by every one of them.
    response.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: ready ? ('ready' as const) : ('degraded' as const),
      timestamp: new Date().toISOString() as IsoTimestamp,
      dependencies,
    };
  }
}
