import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audited, CurrentUser, RequirePermissions, TenantId } from 'src/common/decorators';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StockLevel } from './entities/stock-level.entity';
import { MovementType, StockMovement } from './entities/stock-movement.entity';
import { InventoryService } from './inventory.service';

const MANUAL_MOVEMENT_TYPES = new Set([
  MovementType.ADJUSTMENT,
  MovementType.RETURN,
  MovementType.SCRAP,
]);

@ApiTags('inventory')
@ApiCookieAuth()
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('products/:productId/levels')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Stock levels per warehouse for one product' })
  levels(
    @TenantId() tenantId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<StockLevel[]> {
    return this.service.levelsForProduct(tenantId, productId);
  }

  @Get('products/:productId/movements')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Ledger history for one product' })
  movements(
    @TenantId() tenantId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('limit') limit?: string,
  ): Promise<StockMovement[]> {
    return this.service.movementHistory(tenantId, productId, Math.min(Number(limit) || 50, 200));
  }

  @Post('adjustments')
  @RequirePermissions('inventory:adjust')
  @Audited('inventory.adjust')
  @ApiOperation({ summary: 'Post a manual stock correction' })
  async adjust(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AdjustStockDto,
  ): Promise<StockMovement> {
    if (!MANUAL_MOVEMENT_TYPES.has(dto.type)) {
      throw new BadRequestException({
        code: 'MOVEMENT_TYPE_NOT_MANUAL',
        message: `${dto.type} movements are posted by the order services, not by hand`,
        details: { allowed: [...MANUAL_MOVEMENT_TYPES] },
      });
    }

    return this.service.postMovement({
      tenantId,
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      type: dto.type,
      qtyDelta: dto.qtyDelta,
      note: dto.note,
      userId,
    });
  }

  @Post('rebuild-levels')
  @RequirePermissions('inventory:admin')
  @Audited('inventory.rebuild_levels')
  @ApiOperation({
    summary: 'Recompute running totals from the ledger and report any drift',
  })
  rebuild(@TenantId() tenantId: string): Promise<{ checked: number; corrected: number }> {
    return this.service.rebuildLevels(tenantId);
  }
}
