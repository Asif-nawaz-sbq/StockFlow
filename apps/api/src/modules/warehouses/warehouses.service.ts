import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DuplicateResourceError, ResourceNotFoundError } from 'src/common/errors/domain.errors';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { Warehouse } from './entities/warehouse.entity';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouses: Repository<Warehouse>,
  ) {}

  /** Small, bounded list - the UI wants all of them for dropdowns, so no paging. */
  async list(tenantId: string): Promise<Warehouse[]> {
    return this.warehouses.find({
      where: { tenantId },
      order: { code: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Warehouse> {
    const warehouse = await this.warehouses.findOne({
      where: { tenantId, id },
    });
    if (!warehouse) throw new ResourceNotFoundError('Warehouse', id);
    return warehouse;
  }

  async create(tenantId: string, dto: CreateWarehouseDto): Promise<Warehouse> {
    const clash = await this.warehouses.findOne({
      where: { tenantId, code: dto.code },
      select: { id: true },
    });
    if (clash) throw new DuplicateResourceError('warehouse', 'code', dto.code);

    return this.warehouses.save(
      this.warehouses.create({
        ...dto,
        tenantId,
        country: dto.country ?? 'DE',
      }),
    );
  }

  async update(tenantId: string, id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.findOne(tenantId, id);
    Object.assign(warehouse, dto);
    return this.warehouses.save(warehouse);
  }
}
