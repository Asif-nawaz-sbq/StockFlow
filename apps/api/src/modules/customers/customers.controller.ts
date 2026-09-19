import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audited, RequirePermissions, TenantId } from 'src/common/decorators';
import { PageDto } from 'src/common/dto/pagination.dto';
import { CreateCustomerDto, QueryCustomersDto, UpdateCustomerDto } from './dto/customer.dto';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

@ApiTags('customers')
@ApiCookieAuth()
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @RequirePermissions('customers:read')
  list(
    @TenantId() tenantId: string,
    @Query() query: QueryCustomersDto,
  ): Promise<PageDto<Customer>> {
    return this.service.list(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string): Promise<Customer> {
    return this.service.findOne(tenantId, id);
  }

  @Get(':id/credit')
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Credit limit against the value of open orders' })
  credit(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{
    limitCents: number;
    exposureCents: number;
    availableCents: number;
  }> {
    return this.service.creditStatus(tenantId, id);
  }

  @Post()
  @RequirePermissions('customers:write')
  @Audited('customer.create')
  create(@TenantId() tenantId: string, @Body() dto: CreateCustomerDto): Promise<Customer> {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('customers:write')
  @Audited('customer.update')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.service.update(tenantId, id, dto);
  }
}
