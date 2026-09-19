import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Audited, RequirePermissions, TenantId } from 'src/common/decorators';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { Warehouse } from './entities/warehouse.entity';
import { WarehousesService } from './warehouses.service';

@ApiTags('warehouses')
@ApiCookieAuth()
@Controller({ path: 'warehouses', version: '1' })
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  @RequirePermissions('warehouses:read')
  list(@TenantId() tenantId: string): Promise<Warehouse[]> {
    return this.service.list(tenantId);
  }

  @Get(':id')
  @RequirePermissions('warehouses:read')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Warehouse> {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions('warehouses:write')
  @Audited('warehouse.create')
  create(@TenantId() tenantId: string, @Body() dto: CreateWarehouseDto): Promise<Warehouse> {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('warehouses:write')
  @Audited('warehouse.update')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<Warehouse> {
    return this.service.update(tenantId, id, dto);
  }
}
