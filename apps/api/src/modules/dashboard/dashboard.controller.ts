import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions, TenantId } from 'src/common/decorators';
import { DashboardService, DashboardSummary, RecentMovement } from './dashboard.service';

@ApiTags('dashboard')
@ApiCookieAuth()
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'KPI tiles, 14-day revenue trend and top products' })
  summary(@TenantId() tenantId: string): Promise<DashboardSummary> {
    return this.service.summary(tenantId);
  }

  @Get('recent-movements')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Latest ledger entries across all products' })
  recent(@TenantId() tenantId: string, @Query('limit') limit?: string): Promise<RecentMovement[]> {
    return this.service.recentMovements(tenantId, Math.min(Number(limit) || 15, 50));
  }
}
