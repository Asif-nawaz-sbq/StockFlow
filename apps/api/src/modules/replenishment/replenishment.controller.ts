import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions, TenantId } from 'src/common/decorators';
import { ReplenishmentService, ReplenishmentSuggestion } from './replenishment.service';

@ApiTags('replenishment')
@ApiCookieAuth()
@Controller({ path: 'replenishment', version: '1' })
export class ReplenishmentController {
  constructor(private readonly service: ReplenishmentService) {}

  @Get('suggestions')
  @RequirePermissions('inventory:read')
  @ApiOperation({
    summary: 'Products below their reorder point, with a suggested order quantity',
  })
  suggestions(@TenantId() tenantId: string): Promise<ReplenishmentSuggestion[]> {
    return this.service.suggestions(tenantId);
  }
}
