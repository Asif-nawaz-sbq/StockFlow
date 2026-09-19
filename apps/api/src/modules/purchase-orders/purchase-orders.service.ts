import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { PageDto } from 'src/common/dto/pagination.dto';
import {
  InvalidStateTransitionError,
  ResourceNotFoundError,
} from 'src/common/errors/domain.errors';
import { InventoryService } from 'src/modules/inventory/inventory.service';
import { MovementType } from 'src/modules/inventory/entities/stock-movement.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { ProductSupplier } from 'src/modules/products/entities/product-supplier.entity';
import { Supplier } from 'src/modules/suppliers/entities/supplier.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';
import { nextDocumentNumber } from 'src/modules/sales-orders/document-number';
import {
  CreatePurchaseOrderDto,
  QueryPurchaseOrdersDto,
  ReceiveGoodsDto,
} from './dto/purchase-order.dto';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import {
  PURCHASE_ORDER_TRANSITIONS,
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase-order.entity';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PurchaseOrder)
    private readonly orders: Repository<PurchaseOrder>,
    private readonly inventory: InventoryService,
  ) {}

  async list(tenantId: string, query: QueryPurchaseOrdersDto): Promise<PageDto<PurchaseOrder>> {
    const qb = this.orders
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.warehouse', 'warehouse')
      .where('po.tenant_id = :tenantId', { tenantId });

    if (query.status) qb.andWhere('po.status = :status', { status: query.status });
    if (query.supplierId)
      qb.andWhere('po.supplier_id = :supplierId', {
        supplierId: query.supplierId,
      });
    if (query.search) {
      qb.andWhere('(po.po_number ILIKE :search OR supplier.name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [data, total] = await qb
      .orderBy('po.createdAt', query.sortDir)
      .skip(query.skip)
      .take(query.pageSize)
      .getManyAndCount();

    return new PageDto(data, total, query);
  }

  async findOne(tenantId: string, id: string): Promise<PurchaseOrder> {
    const order = await this.orders.findOne({
      where: { tenantId, id },
      relations: { supplier: true, warehouse: true, lines: { product: true } },
      order: { lines: { createdAt: 'ASC' } },
    });
    if (!order) throw new ResourceNotFoundError('PurchaseOrder', id);
    return order;
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const id = await this.dataSource.transaction(async (em) => {
      const [supplier, warehouse] = await Promise.all([
        em.findOne(Supplier, { where: { tenantId, id: dto.supplierId } }),
        em.findOne(Warehouse, { where: { tenantId, id: dto.warehouseId } }),
      ]);
      if (!supplier) throw new ResourceNotFoundError('Supplier', dto.supplierId);
      if (!warehouse) throw new ResourceNotFoundError('Warehouse', dto.warehouseId);

      const productIds = [...new Set(dto.lines.map((l) => l.productId))];
      const products = await em.find(Product, {
        where: { tenantId, id: In(productIds) },
      });
      const missing = productIds.filter((pid) => !products.some((p) => p.id === pid));
      if (missing.length > 0) throw new ResourceNotFoundError('Product', missing.join(', '));

      // Fall back to the agreed supplier cost when the caller doesn't override it.
      const links = await em.find(ProductSupplier, {
        where: { tenantId, supplierId: supplier.id, productId: In(productIds) },
      });
      const costByProduct = new Map(links.map((l) => [l.productId, l.costPriceCents]));

      const poNumber = await nextDocumentNumber(em, tenantId, 'purchase_orders', 'po_number', 'PO');

      const lines = dto.lines.map((line) => {
        const unitCostCents = line.unitCostCents ?? costByProduct.get(line.productId);
        if (unitCostCents === undefined) {
          throw new BadRequestException({
            code: 'SUPPLIER_COST_UNKNOWN',
            message: 'No agreed cost for this product with this supplier - pass unitCostCents',
            details: { productId: line.productId, supplierId: supplier.id },
          });
        }
        return em.create(PurchaseOrderLine, {
          tenantId,
          productId: line.productId,
          qtyOrdered: line.qtyOrdered,
          qtyReceived: 0,
          unitCostCents,
        });
      });

      const order = em.create(PurchaseOrder, {
        tenantId,
        poNumber,
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        status: PurchaseOrderStatus.DRAFT,
        currency: 'EUR',
        subtotalCents: lines.reduce((sum, l) => sum + l.unitCostCents * l.qtyOrdered, 0),
        expectedAt: dto.expectedAt ?? this.defaultExpectedAt(supplier.leadTimeDays),
        notes: dto.notes ?? null,
        createdByUserId: userId,
        lines,
      });

      const saved = await em.save(PurchaseOrder, order);
      return saved.id;
    });

    return this.findOne(tenantId, id);
  }

  /** Sending a PO makes the quantities visible to replenishment as on-order. */
  async send(tenantId: string, id: string): Promise<PurchaseOrder> {
    await this.dataSource.transaction(async (em) => {
      const order = await this.lockOrder(em, tenantId, id);
      this.assertTransition(order, PurchaseOrderStatus.SENT);

      const lines = await em.find(PurchaseOrderLine, {
        where: { tenantId, purchaseOrderId: id },
      });

      await this.inventory.adjustOnOrder(
        em,
        tenantId,
        order.warehouseId,
        lines.map((l) => ({
          productId: l.productId,
          qty: l.qtyOrdered - l.qtyReceived,
        })),
        1,
      );

      await em.update(
        PurchaseOrder,
        { id },
        { status: PurchaseOrderStatus.SENT, sentAt: new Date() },
      );
    });

    await this.inventory.invalidate(tenantId);
    return this.findOne(tenantId, id);
  }

  /**
   * Books a delivery. Partial deliveries are normal, so this accepts any subset
   * of lines and only closes the PO once every line is fully received.
   */
  async receive(
    tenantId: string,
    userId: string,
    id: string,
    dto: ReceiveGoodsDto,
  ): Promise<PurchaseOrder> {
    await this.dataSource.transaction(async (em) => {
      const order = await this.lockOrder(em, tenantId, id);

      if (
        order.status !== PurchaseOrderStatus.SENT &&
        order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
      ) {
        throw new InvalidStateTransitionError(
          'PurchaseOrder',
          order.status,
          PurchaseOrderStatus.PARTIALLY_RECEIVED,
        );
      }

      const lines = await em.find(PurchaseOrderLine, {
        where: { tenantId, purchaseOrderId: id },
      });
      const byId = new Map(lines.map((l) => [l.id, l]));

      for (const receipt of dto.lines) {
        const line = byId.get(receipt.lineId);
        if (!line) throw new ResourceNotFoundError('PurchaseOrderLine', receipt.lineId);

        const outstanding = line.qtyOrdered - line.qtyReceived;
        if (receipt.qty > outstanding) {
          throw new BadRequestException({
            code: 'OVER_RECEIPT',
            message: 'Cannot receive more than was ordered on this line',
            details: { lineId: line.id, outstanding, attempted: receipt.qty },
          });
        }

        await this.inventory.postMovement(
          {
            tenantId,
            productId: line.productId,
            warehouseId: order.warehouseId,
            type: MovementType.RECEIPT,
            qtyDelta: receipt.qty,
            unitCostCents: line.unitCostCents,
            referenceType: 'purchase_order',
            referenceId: order.id,
            note: dto.deliveryNote ?? null,
            userId,
          },
          em,
        );

        await em.update(
          PurchaseOrderLine,
          { id: line.id },
          { qtyReceived: line.qtyReceived + receipt.qty },
        );

        line.qtyReceived += receipt.qty;
      }

      await this.inventory.adjustOnOrder(
        em,
        tenantId,
        order.warehouseId,
        dto.lines.map((r) => ({
          productId: (byId.get(r.lineId) as PurchaseOrderLine).productId,
          qty: r.qty,
        })),
        -1,
      );

      const fullyReceived = lines.every((l) => l.qtyReceived >= l.qtyOrdered);

      await em.update(
        PurchaseOrder,
        { id },
        fullyReceived
          ? { status: PurchaseOrderStatus.RECEIVED, receivedAt: new Date() }
          : { status: PurchaseOrderStatus.PARTIALLY_RECEIVED },
      );

      this.logger.log(
        { purchaseOrderId: id, lines: dto.lines.length, fullyReceived },
        'goods receipt booked',
      );
    });

    await this.inventory.invalidate(tenantId);
    return this.findOne(tenantId, id);
  }

  async cancel(tenantId: string, id: string): Promise<PurchaseOrder> {
    await this.dataSource.transaction(async (em) => {
      const order = await this.lockOrder(em, tenantId, id);
      this.assertTransition(order, PurchaseOrderStatus.CANCELLED);

      if (order.status !== PurchaseOrderStatus.DRAFT) {
        const lines = await em.find(PurchaseOrderLine, {
          where: { tenantId, purchaseOrderId: id },
        });
        // Only the outstanding remainder was ever counted as on-order.
        await this.inventory.adjustOnOrder(
          em,
          tenantId,
          order.warehouseId,
          lines.map((l) => ({
            productId: l.productId,
            qty: l.qtyOrdered - l.qtyReceived,
          })),
          -1,
        );
      }

      await em.update(PurchaseOrder, { id }, { status: PurchaseOrderStatus.CANCELLED });
    });

    await this.inventory.invalidate(tenantId);
    return this.findOne(tenantId, id);
  }

  private defaultExpectedAt(leadTimeDays: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + leadTimeDays);
    return date.toISOString().slice(0, 10);
  }

  private async lockOrder(em: EntityManager, tenantId: string, id: string): Promise<PurchaseOrder> {
    const order = await em
      .createQueryBuilder(PurchaseOrder, 'po')
      .setLock('pessimistic_write')
      .where('po.tenant_id = :tenantId', { tenantId })
      .andWhere('po.id = :id', { id })
      .getOne();
    if (!order) throw new ResourceNotFoundError('PurchaseOrder', id);
    return order;
  }

  private assertTransition(order: PurchaseOrder, to: PurchaseOrderStatus): void {
    if (!PURCHASE_ORDER_TRANSITIONS[order.status].includes(to)) {
      throw new InvalidStateTransitionError('PurchaseOrder', order.status, to);
    }
  }
}
