import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audited, CurrentUser, RequirePermissions, TenantId } from 'src/common/decorators';
import { PageDto } from 'src/common/dto/pagination.dto';
import { IdempotencyInterceptor } from 'src/common/interceptors/idempotency.interceptor';
import { CancelSalesOrderDto, CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { QuerySalesOrdersDto } from './dto/query-sales-orders.dto';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrdersService } from './sales-orders.service';

@ApiTags('sales-orders')
@ApiCookieAuth()
@Controller({ path: 'sales-orders', version: '1' })
export class SalesOrdersController {
  constructor(private readonly service: SalesOrdersService) {}

  @Get()
  @RequirePermissions('sales_orders:read')
  @ApiOperation({ summary: 'List sales orders' })
  list(
    @TenantId() tenantId: string,
    @Query() query: QuerySalesOrdersDto,
  ): Promise<PageDto<SalesOrder>> {
    return this.service.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('sales_orders:read')
  @ApiOperation({ summary: 'Order with lines and allocation state' })
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesOrder> {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions('sales_orders:write')
  @Audited('sales_order.create')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiOperation({ summary: 'Create a draft order' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('permissions') permissions: string[],
    @Body() dto: CreateSalesOrderDto,
  ): Promise<SalesOrder> {
    return this.service.create(
      tenantId,
      userId,
      dto,
      permissions.includes('sales_orders:override_price'),
    );
  }

  @Post(':id/confirm')
  @RequirePermissions('sales_orders:confirm')
  @Audited('sales_order.confirm')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiOperation({ summary: 'Reserve stock and confirm the order' })
  confirm(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesOrder> {
    return this.service.confirm(tenantId, userId, id);
  }

  @Post(':id/pick')
  @RequirePermissions('sales_orders:fulfil')
  @Audited('sales_order.pick')
  @ApiOperation({ summary: 'Mark the order as picked in the warehouse' })
  pick(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string): Promise<SalesOrder> {
    return this.service.markPicked(tenantId, id);
  }

  @Post(':id/ship')
  @RequirePermissions('sales_orders:fulfil')
  @Audited('sales_order.ship')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiOperation({ summary: 'Issue reserved stock and close the order' })
  ship(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesOrder> {
    return this.service.ship(tenantId, userId, id);
  }

  @Post(':id/cancel')
  @RequirePermissions('sales_orders:write')
  @Audited('sales_order.cancel')
  @ApiOperation({ summary: 'Cancel and release any reserved stock' })
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSalesOrderDto,
  ): Promise<SalesOrder> {
    return this.service.cancel(tenantId, id, dto.reason);
  }
}
