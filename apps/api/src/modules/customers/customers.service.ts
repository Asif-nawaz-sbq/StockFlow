import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageDto } from 'src/common/dto/pagination.dto';
import { DuplicateResourceError, ResourceNotFoundError } from 'src/common/errors/domain.errors';
import { SalesOrder } from 'src/modules/sales-orders/entities/sales-order.entity';
import { creditExposureCents } from './credit-exposure';
import { CreateCustomerDto, QueryCustomersDto, UpdateCustomerDto } from './dto/customer.dto';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(SalesOrder)
    private readonly orders: Repository<SalesOrder>,
  ) {}

  async list(tenantId: string, query: QueryCustomersDto): Promise<PageDto<Customer>> {
    const qb = this.customers
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId });

    if (query.isActive !== undefined) {
      qb.andWhere('c.is_active = :isActive', { isActive: query.isActive });
    }
    if (query.search) {
      qb.andWhere('(c.name ILIKE :search OR c.code ILIKE :search OR c.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [data, total] = await qb
      .orderBy('c.name', 'ASC')
      .skip(query.skip)
      .take(query.pageSize)
      .getManyAndCount();

    return new PageDto(data, total, query);
  }

  async findOne(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.customers.findOne({ where: { tenantId, id } });
    if (!customer) throw new ResourceNotFoundError('Customer', id);
    return customer;
  }

  /** Credit limit against what the customer currently owes. */
  async creditStatus(
    tenantId: string,
    id: string,
  ): Promise<{ limitCents: number; exposureCents: number; availableCents: number }> {
    const customer = await this.findOne(tenantId, id);

    const exposureCents = await creditExposureCents(
      this.orders.manager,
      tenantId,
      id,
      customer.paymentTermsDays,
    );

    return {
      limitCents: customer.creditLimitCents,
      exposureCents,
      availableCents: Math.max(0, customer.creditLimitCents - exposureCents),
    };
  }

  async create(tenantId: string, dto: CreateCustomerDto): Promise<Customer> {
    const clash = await this.customers.findOne({
      where: { tenantId, code: dto.code },
      select: { id: true },
    });
    if (clash) throw new DuplicateResourceError('customer', 'code', dto.code);

    return this.customers.save(
      this.customers.create({
        ...dto,
        tenantId,
        contactName: dto.contactName ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        vatId: dto.vatId ?? null,
        billingCountry: dto.billingCountry ?? 'DE',
        creditLimitCents: dto.creditLimitCents ?? 0,
        paymentTermsDays: dto.paymentTermsDays ?? 14,
      }),
    );
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(tenantId, id);
    Object.assign(customer, dto);
    return this.customers.save(customer);
  }
}
