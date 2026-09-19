import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageDto } from 'src/common/dto/pagination.dto';
import { DuplicateResourceError, ResourceNotFoundError } from 'src/common/errors/domain.errors';
import { CreateSupplierDto, QuerySuppliersDto, UpdateSupplierDto } from './dto/supplier.dto';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliers: Repository<Supplier>,
  ) {}

  async list(tenantId: string, query: QuerySuppliersDto): Promise<PageDto<Supplier>> {
    const qb = this.suppliers
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId });

    if (query.isActive !== undefined) {
      qb.andWhere('s.is_active = :isActive', { isActive: query.isActive });
    }
    if (query.search) {
      qb.andWhere('(s.name ILIKE :search OR s.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [data, total] = await qb
      .orderBy('s.name', 'ASC')
      .skip(query.skip)
      .take(query.pageSize)
      .getManyAndCount();

    return new PageDto(data, total, query);
  }

  async findOne(tenantId: string, id: string): Promise<Supplier> {
    const supplier = await this.suppliers.findOne({ where: { tenantId, id } });
    if (!supplier) throw new ResourceNotFoundError('Supplier', id);
    return supplier;
  }

  async create(tenantId: string, dto: CreateSupplierDto): Promise<Supplier> {
    const clash = await this.suppliers.findOne({
      where: { tenantId, code: dto.code },
      select: { id: true },
    });
    if (clash) throw new DuplicateResourceError('supplier', 'code', dto.code);

    return this.suppliers.save(
      this.suppliers.create({
        ...dto,
        tenantId,
        contactName: dto.contactName ?? null,
        contactEmail: dto.contactEmail ?? null,
        contactPhone: dto.contactPhone ?? null,
        vatId: dto.vatId ?? null,
        country: dto.country ?? 'DE',
        leadTimeDays: dto.leadTimeDays ?? 7,
        paymentTermsDays: dto.paymentTermsDays ?? 30,
      }),
    );
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(tenantId, id);
    Object.assign(supplier, dto);
    return this.suppliers.save(supplier);
  }
}
