import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { PageDto } from 'src/common/dto/pagination.dto';
import {
  CreditLimitExceededError,
  InvalidStateTransitionError,
  ResourceNotFoundError,
} from 'src/common/errors/domain.errors';
import { calculateLineTotals, sumOrderTotals } from 'src/common/money/money';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { creditExposureCents } from 'src/modules/customers/credit-exposure';
import { InventoryService } from 'src/modules/inventory/inventory.service';
import { Product } from 'src/modules/products/entities/product.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { QuerySalesOrdersDto } from './dto/query-sales-orders.dto';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import {
  SALES_ORDER_TRANSITIONS,
  SalesOrder,
  SalesOrderStatus,
} from './entities/sales-order.entity';
import { nextDocumentNumber } from './document-number';

@Injectable()
export class SalesOrdersService {
  private readonly logger = new Logger(SalesOrdersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SalesOrder)
    private readonly orders: Repository<SalesOrder>,
    private readonly inventory: InventoryService,
  ) {}

  async list(tenantId: string, query: QuerySalesOrdersDto): Promise<PageDto<SalesOrder>> {
    const qb = this.orders
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'customer')
      .leftJoinAndSelect('o.warehouse', 'warehouse')
      .where('o.tenant_id = :tenantId', { tenantId });

    if (query.status) qb.andWhere('o.status = :status', { status: query.status });
    if (query.customerId)
      qb.andWhere('o.customer_id = :customerId', {
        customerId: query.customerId,
      });
    if (query.warehouseId) {
      qb.andWhere('o.warehouse_id = :warehouseId', {
        warehouseId: query.warehouseId,
      });
    }
    if (query.search) {
      qb.andWhere('(o.order_number ILIKE :search OR customer.name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [data, total] = await qb
      .orderBy(`o.${query.sortBy}`, query.sortDir)
      .skip(query.skip)
      .take(query.pageSize)
      .getManyAndCount();

    return new PageDto(data, total, query);
  }

  async findOne(tenantId: string, id: string): Promise<SalesOrder> {
    const order = await this.orders.findOne({
      where: { tenantId, id },
      relations: { customer: true, warehouse: true, lines: { product: true } },
      order: { lines: { createdAt: 'ASC' } },
    });
    if (!order) throw new ResourceNotFoundError('SalesOrder', id);
    return order;
  }

  /**
   * Creates a draft. No stock is touched here - a draft is just a quote, and
   * reserving on create would let anyone starve the warehouse by opening
   * orders they never confirm.
   */
  async create(
    tenantId: string,
    userId: string,
    dto: CreateSalesOrderDto,
    canOverridePrice: boolean,
  ): Promise<SalesOrder> {
    const orderId = await this.dataSource.transaction(async (em) => {
      const [customer, warehouse] = await Promise.all([
        em.findOne(Customer, { where: { tenantId, id: dto.customerId } }),
        em.findOne(Warehouse, { where: { tenantId, id: dto.warehouseId } }),
      ]);

      if (!customer) throw new ResourceNotFoundError('Customer', dto.customerId);
      if (!warehouse) throw new ResourceNotFoundError('Warehouse', dto.warehouseId);

      const productIds = [...new Set(dto.lines.map((l) => l.productId))];
      const products = await em.find(Product, {
        where: { tenantId, id: In(productIds), isActive: true },
      });

      const byId = new Map(products.map((p) => [p.id, p]));
      const missing = productIds.filter((id) => !byId.has(id));
      if (missing.length > 0) throw new ResourceNotFoundError('Product', missing.join(', '));

      const orderNumber = await nextDocumentNumber(
        em,
        tenantId,
        'sales_orders',
        'order_number',
        'SO',
      );

      const lines = dto.lines.map((line) => {
        const product = byId.get(line.productId) as Product;

        // Price is taken from the product unless the caller holds the override
        // permission; a client-supplied price is otherwise ignored, not trusted.
        const unitPriceCents =
          canOverridePrice && line.unitPriceCents !== undefined
            ? line.unitPriceCents
            : product.sellPriceCents;

        const totals = calculateLineTotals(
          unitPriceCents,
          line.qty,
          product.vatRate,
          line.discountPercent ?? '0.00',
        );

        return em.create(SalesOrderLine, {
          tenantId,
          productId: product.id,
          qty: line.qty,
          allocatedQty: 0,
          unitPriceCents,
          discountPercent: line.discountPercent ?? '0.00',
          vatRate: product.vatRate,
          netCents: totals.netCents,
          vatCents: totals.vatCents,
          grossCents: totals.grossCents,
        });
      });

      const totals = sumOrderTotals(
        lines.map((l) => ({
          netCents: l.netCents,
          vatCents: l.vatCents,
          grossCents: l.grossCents,
        })),
      );

      const order = em.create(SalesOrder, {
        tenantId,
        orderNumber,
        customerId: customer.id,
        warehouseId: warehouse.id,
        status: SalesOrderStatus.DRAFT,
        currency: warehouse.country === 'CH' ? 'CHF' : 'EUR',
        subtotalCents: totals.subtotalCents,
        vatTotalCents: totals.vatTotalCents,
        grandTotalCents: totals.grandTotalCents,
        placedAt: new Date(),
        notes: dto.notes ?? null,
        createdByUserId: userId,
        lines,
      });

      const saved = await em.save(SalesOrder, order);
      return saved.id;
    });

    return this.findOne(tenantId, orderId);
  }

  /**
   * Confirms a draft and reserves stock for every line, all or nothing.
   *
   * The credit check runs inside the same transaction as the reservation so a
   * customer cannot slip two orders past their limit by submitting both at once.
   */
  async confirm(tenantId: string, userId: string, id: string): Promise<SalesOrder> {
    await this.dataSource.transaction(async (em) => {
      const order = await this.lockOrder(em, tenantId, id);
      this.assertTransition(order, SalesOrderStatus.CONFIRMED);

      const lines = await em.find(SalesOrderLine, {
        where: { tenantId, orderId: order.id },
      });

      await this.assertWithinCreditLimit(em, tenantId, order);

      await this.inventory.reserve(
        em,
        tenantId,
        order.warehouseId,
        lines.map((line) => ({ productId: line.productId, qty: line.qty })),
      );

      // Everything reserved, so allocated_qty mirrors qty on every line.
      await em
        .createQueryBuilder()
        .update(SalesOrderLine)
        .set({ allocatedQty: () => '"qty"' })
        .where('order_id = :orderId', { orderId: order.id })
        .execute();

      await em.update(
        SalesOrder,
        { id: order.id },
        { status: SalesOrderStatus.CONFIRMED, confirmedAt: new Date() },
      );

      this.logger.log({ orderId: order.id, userId, lines: lines.length }, 'sales order confirmed');
    });

    await this.inventory.invalidate(tenantId);
    return this.findOne(tenantId, id);
  }

  async markPicked(tenantId: string, id: string): Promise<SalesOrder> {
    await this.dataSource.transaction(async (em) => {
      const order = await this.lockOrder(em, tenantId, id);
      this.assertTransition(order, SalesOrderStatus.PICKED);
      await em.update(SalesOrder, { id: order.id }, { status: SalesOrderStatus.PICKED });
    });
    return this.findOne(tenantId, id);
  }

  /**
   * Ships: turns the reservation into an issue movement. This is the only
   * point at which on-hand stock actually drops.
   */
  async ship(tenantId: string, userId: string, id: string): Promise<SalesOrder> {
    await this.dataSource.transaction(async (em) => {
      const order = await this.lockOrder(em, tenantId, id);
      this.assertTransition(order, SalesOrderStatus.SHIPPED);

      const lines = await em.find(SalesOrderLine, {
        where: { tenantId, orderId: order.id },
      });

      await this.inventory.issueReserved(
        em,
        tenantId,
        order.warehouseId,
        lines.map((line) => ({
          productId: line.productId,
          qty: line.allocatedQty,
        })),
        { type: 'sales_order', id: order.id },
        userId,
      );

      await em.update(
        SalesOrder,
        { id: order.id },
        { status: SalesOrderStatus.SHIPPED, shippedAt: new Date() },
      );
    });

    await this.inventory.invalidate(tenantId);
    return this.findOne(tenantId, id);
  }

  /** Cancels and gives any held stock back. Shipped orders cannot be cancelled. */
  async cancel(tenantId: string, id: string, reason?: string): Promise<SalesOrder> {
    await this.dataSource.transaction(async (em) => {
      const order = await this.lockOrder(em, tenantId, id);
      this.assertTransition(order, SalesOrderStatus.CANCELLED);

      if (order.status !== SalesOrderStatus.DRAFT) {
        const lines = await em.find(SalesOrderLine, {
          where: { tenantId, orderId: order.id },
        });
        await this.inventory.release(
          em,
          tenantId,
          order.warehouseId,
          lines
            .filter((line) => line.allocatedQty > 0)
            .map((line) => ({
              productId: line.productId,
              qty: line.allocatedQty,
            })),
        );
        await em.update(SalesOrderLine, { orderId: order.id }, { allocatedQty: 0 });
      }

      await em.update(
        SalesOrder,
        { id: order.id },
        {
          status: SalesOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason ?? null,
        },
      );
    });

    await this.inventory.invalidate(tenantId);
    return this.findOne(tenantId, id);
  }

  private async lockOrder(em: EntityManager, tenantId: string, id: string): Promise<SalesOrder> {
    const order = await em
      .createQueryBuilder(SalesOrder, 'o')
      .setLock('pessimistic_write')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.id = :id', { id })
      .getOne();

    if (!order) throw new ResourceNotFoundError('SalesOrder', id);
    return order;
  }

  private assertTransition(order: SalesOrder, to: SalesOrderStatus): void {
    if (!SALES_ORDER_TRANSITIONS[order.status].includes(to)) {
      throw new InvalidStateTransitionError('SalesOrder', order.status, to);
    }
  }

  private async assertWithinCreditLimit(
    em: EntityManager,
    tenantId: string,
    order: SalesOrder,
  ): Promise<void> {
    const customer = await em.findOne(Customer, { where: { tenantId, id: order.customerId } });
    if (!customer || customer.creditLimitCents <= 0) return;

    const outstanding = await creditExposureCents(
      em,
      tenantId,
      customer.id,
      customer.paymentTermsDays,
      order.id,
    );

    const exposure = outstanding + order.grandTotalCents;
    if (exposure > customer.creditLimitCents) {
      throw new CreditLimitExceededError(customer.id, customer.creditLimitCents, exposure);
    }
  }
}
