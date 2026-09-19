import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audited, RequirePermissions, TenantId } from 'src/common/decorators';
import { PageDto } from 'src/common/dto/pagination.dto';
import { CreateProductDto, QueryProductsDto, UpdateProductDto } from './dto/product.dto';
import { Product } from './entities/product.entity';
import { ProductsService, ProductWithStock } from './products.service';

@ApiTags('products')
@ApiCookieAuth()
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @RequirePermissions('products:read')
  @ApiOperation({ summary: 'List products with rolled-up stock' })
  list(
    @TenantId() tenantId: string,
    @Query() query: QueryProductsDto,
  ): Promise<PageDto<ProductWithStock>> {
    return this.service.list(tenantId, query);
  }

  @Get('categories')
  @RequirePermissions('products:read')
  @ApiOperation({ summary: 'Distinct categories, for filter dropdowns' })
  categories(@TenantId() tenantId: string): Promise<string[]> {
    return this.service.categories(tenantId);
  }

  @Get(':id')
  @RequirePermissions('products:read')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions('products:write')
  @Audited('product.create')
  create(@TenantId() tenantId: string, @Body() dto: CreateProductDto): Promise<Product> {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('products:write')
  @Audited('product.update')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('products:write')
  @Audited('product.archive')
  @ApiOperation({ summary: 'Archive - products are never hard deleted' })
  archive(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.service.archive(tenantId, id);
  }
}
