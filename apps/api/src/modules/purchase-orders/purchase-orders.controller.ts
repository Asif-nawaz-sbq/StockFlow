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
import {
  CreatePurchaseOrderDto,
  QueryPurchaseOrdersDto,
  ReceiveGoodsDto,
} from './dto/purchase-order.dto';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('purchase-orders')
@ApiCookieAuth()
@Controller({ path: 'purchase-orders', version: '1' })
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get()
  @RequirePermissions('purchase_orders:read')
  @ApiOperation({ summary: 'List purchase orders' })
  list(
    @TenantId() tenantId: string,
    @Query() query: QueryPurchaseOrdersDto,
  ): Promise<PageDto<PurchaseOrder>> {
    return this.service.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('purchase_orders:read')
  @ApiOperation({ summary: 'Purchase order with lines and receipt progress' })
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrder> {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions('purchase_orders:write')
  @Audited('purchase_order.create')
  @ApiOperation({ summary: 'Raise a draft purchase order' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    return this.service.create(tenantId, userId, dto);
  }

  @Post(':id/send')
  @RequirePermissions('purchase_orders:write')
  @Audited('purchase_order.send')
  @ApiOperation({
    summary: 'Send to the supplier and count the lines as on-order',
  })
  send(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrder> {
    return this.service.send(tenantId, id);
  }

  @Post(':id/receive')
  @RequirePermissions('purchase_orders:receive')
  @Audited('purchase_order.receive')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiOperation({ summary: 'Book a full or partial goods receipt' })
  receive(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveGoodsDto,
  ): Promise<PurchaseOrder> {
    return this.service.receive(tenantId, userId, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('purchase_orders:write')
  @Audited('purchase_order.cancel')
  @ApiOperation({
    summary: 'Cancel and drop the outstanding on-order quantity',
  })
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseOrder> {
    return this.service.cancel(tenantId, id);
  }
}
