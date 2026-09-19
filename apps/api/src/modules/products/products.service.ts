import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageDto } from 'src/common/dto/pagination.dto';
import { DuplicateResourceError, ResourceNotFoundError } from 'src/common/errors/domain.errors';
import { CreateProductDto, QueryProductsDto, UpdateProductDto } from './dto/product.dto';
import { Product } from './entities/product.entity';

export interface ProductWithStock extends Product {
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
}

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private readonly products: Repository<Product>) {}

  /**
   * Lists products with their stock rolled up across warehouses. Done as a
   * single grouped join rather than an N+1 of per-product level lookups - the
   * product table is the most-hit page in the app.
   */
  async list(tenantId: string, query: QueryProductsDto): Promise<PageDto<ProductWithStock>> {
    const qb = this.products
      .createQueryBuilder('p')
      .leftJoin('stock_levels', 'sl', 'sl.product_id = p.id')
      .addSelect('COALESCE(SUM(sl.on_hand), 0)::int', 'totalOnHand')
      .addSelect('COALESCE(SUM(sl.reserved), 0)::int', 'totalReserved')
      .where('p.tenant_id = :tenantId', { tenantId })
      .groupBy('p.id');

    if (query.category) qb.andWhere('p.category = :category', { category: query.category });
    if (query.isActive !== undefined)
      qb.andWhere('p.is_active = :isActive', { isActive: query.isActive });
    if (query.search) {
      qb.andWhere('(p.sku ILIKE :search OR p.name ILIKE :search OR p.ean = :exact)', {
        search: `%${query.search}%`,
        exact: query.search,
      });
    }

    const total = await qb.getCount();

    const { entities, raw } = await qb
      .orderBy(`p.${query.sortBy}`, query.sortDir)
      .offset(query.skip)
      .limit(query.pageSize)
      .getRawAndEntities();

    const data = entities.map((product, index) => {
      const onHand = Number(raw[index]?.totalOnHand ?? 0);
      const reserved = Number(raw[index]?.totalReserved ?? 0);
      return Object.assign(product, {
        totalOnHand: onHand,
        totalReserved: reserved,
        totalAvailable: onHand - reserved,
      }) as ProductWithStock;
    });

    return new PageDto(data, total, query);
  }

  async findOne(tenantId: string, id: string): Promise<Product> {
    const product = await this.products.findOne({
      where: { tenantId, id },
      relations: { supplierLinks: { supplier: true } },
    });
    if (!product) throw new ResourceNotFoundError('Product', id);
    return product;
  }

  async categories(tenantId: string): Promise<string[]> {
    const rows = await this.products
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.tenant_id = :tenantId', { tenantId })
      .orderBy('category', 'ASC')
      .getRawMany<{ category: string }>();
    return rows.map((row) => row.category);
  }

  async create(tenantId: string, dto: CreateProductDto): Promise<Product> {
    const clash = await this.products.findOne({
      where: { tenantId, sku: dto.sku },
      select: { id: true },
    });
    if (clash) throw new DuplicateResourceError('product', 'SKU', dto.sku);

    const product = this.products.create({
      ...dto,
      tenantId,
      ean: dto.ean ?? null,
      description: dto.description ?? null,
      reorderPoint: dto.reorderPoint ?? 0,
      reorderQuantity: dto.reorderQuantity ?? 0,
      weightGrams: dto.weightGrams ?? null,
    });

    return this.products.save(product);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(tenantId, id);
    Object.assign(product, dto);
    return this.products.save(product);
  }

  /**
   * Archive rather than delete. Products are referenced by historic order lines
   * and by the ledger, so a hard delete would either fail on the FK or destroy
   * the audit trail.
   */
  async archive(tenantId: string, id: string): Promise<Product> {
    const product = await this.findOne(tenantId, id);
    product.isActive = false;
    return this.products.save(product);
  }
}
