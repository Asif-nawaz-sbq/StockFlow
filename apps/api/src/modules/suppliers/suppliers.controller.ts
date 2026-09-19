import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Audited, RequirePermissions, TenantId } from 'src/common/decorators';
import { PageDto } from 'src/common/dto/pagination.dto';
import { CreateSupplierDto, QuerySuppliersDto, UpdateSupplierDto } from './dto/supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiCookieAuth()
@Controller({ path: 'suppliers', version: '1' })
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @RequirePermissions('suppliers:read')
  list(
    @TenantId() tenantId: string,
    @Query() query: QuerySuppliersDto,
  ): Promise<PageDto<Supplier>> {
    return this.service.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('suppliers:read')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string): Promise<Supplier> {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions('suppliers:write')
  @Audited('supplier.create')
  create(@TenantId() tenantId: string, @Body() dto: CreateSupplierDto): Promise<Supplier> {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('suppliers:write')
  @Audited('supplier.update')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<Supplier> {
    return this.service.update(tenantId, id, dto);
  }
}
