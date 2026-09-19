import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from 'src/common/decorators';
import { RedisService } from 'src/redis/redis.service';

@ApiExcludeController()
// Excluded from the /api prefix and from URI versioning: the ALB target group
// health check should not have to track which API version is current.
@Controller({ path: 'health', version: VERSION_NEUTRAL })
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisService,
  ) {}

  /**
   * ALB target group and ECS container health check point here. Deliberately
   * checks nothing external: if Postgres blips, we do not want the load
   * balancer to pull every task out of service and turn a slow database into a
   * total outage.
   */
  @Public()
  @Get('live')
  live(): { status: string; uptime: number } {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }

  /**
   * Readiness, used by deployments and by the operator dashboards. Reports
   * Redis as a warning rather than a failure - the API degrades to uncached
   * reads without it, so a Redis outage should not fail a deploy.
   */
  @Public()
  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('postgres', { timeout: 3_000 }),
      async (): Promise<HealthIndicatorResult> => {
        const up = await this.redis.ping();
        return { redis: { status: up ? 'up' : 'down', degraded: !up } };
      },
    ]);
  }
}
