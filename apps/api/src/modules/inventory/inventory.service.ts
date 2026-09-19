import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { InsufficientStockError, ResourceNotFoundError } from 'src/common/errors/domain.errors';
import { Product } from 'src/modules/products/entities/product.entity';
import { RedisService } from 'src/redis/redis.service';
import { cacheKeys } from 'src/redis/cache-keys';
import { StockLevel } from './entities/stock-level.entity';
import { MovementType, StockMovement } from './entities/stock-movement.entity';

export interface MovementRequest {
  tenantId: string;
  productId: string;
  warehouseId: string;
  type: MovementType;
  qtyDelta: number;
  unitCostCents?: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  occurredAt?: Date;
  userId?: string | null;
}

export interface AllocationRequest {
  productId: string;
  qty: number;
}

/**
 * Owns every write to stock_movements and stock_levels. Nothing else in the
 * codebase touches those two tables directly, which is what makes the ledger
 * trustworthy as an audit trail.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StockLevel)
    private readonly levels: Repository<StockLevel>,
    @InjectRepository(StockMovement)
    private readonly movements: Repository<StockMovement>,
    private readonly redis: RedisService,
  ) {}

  /**
   * Appends a ledger row and moves the running total in one transaction.
   *
   * The stock_levels row is locked FOR UPDATE before it is read, so two
   * concurrent movements on the same (product, warehouse) serialise instead of
   * both computing balance_after from the same stale on_hand value.
   */
  async postMovement(request: MovementRequest, manager?: EntityManager): Promise<StockMovement> {
    const run = async (em: EntityManager): Promise<StockMovement> => {
      if (request.qtyDelta === 0) {
        throw new RangeError('A stock movement with a zero delta is meaningless');
      }

      const level = await this.lockLevel(
        em,
        request.tenantId,
        request.productId,
        request.warehouseId,
      );
      const onHand = level.onHand + request.qtyDelta;

      if (onHand < 0) {
        const product = await em.findOne(Product, {
          where: { id: request.productId },
        });
        throw new InsufficientStockError([
          {
            productId: request.productId,
            sku: product?.sku ?? 'unknown',
            requested: Math.abs(request.qtyDelta),
            available: level.onHand,
          },
        ]);
      }

      const occurredAt = request.occurredAt ?? new Date();

      await em.update(StockLevel, { id: level.id }, { onHand, lastMovementAt: occurredAt });

      const movement = em.create(StockMovement, {
        tenantId: request.tenantId,
        productId: request.productId,
        warehouseId: request.warehouseId,
        type: request.type,
        qtyDelta: request.qtyDelta,
        balanceAfter: onHand,
        unitCostCents: request.unitCostCents ?? null,
        referenceType: request.referenceType ?? null,
        referenceId: request.referenceId ?? null,
        note: request.note ?? null,
        occurredAt,
        createdByUserId: request.userId ?? null,
      });

      return em.save(StockMovement, movement);
    };

    if (manager) {
      // Caller owns the transaction and invalidates once it commits.
      return run(manager);
    }

    const result = await this.dataSource.transaction(run);
    await this.invalidate(request.tenantId);
    return result;
  }

  /**
   * Reserves stock for a confirmed sales order.
   *
   * Rows are locked in a deterministic order (sorted by product id) because two
   * orders containing the same products in different sequences would otherwise
   * grab locks in opposite order and deadlock. Postgres would kill one of them,
   * which shows up as a random 500 under load.
   *
   * Must be called inside an existing transaction - the caller also flips the
   * order status, and a partial reservation would be worse than none.
   */
  async reserve(
    em: EntityManager,
    tenantId: string,
    warehouseId: string,
    requests: AllocationRequest[],
  ): Promise<void> {
    const ordered = [...requests].sort((a, b) => a.productId.localeCompare(b.productId));
    const shortfalls: Array<{
      productId: string;
      sku: string;
      requested: number;
      available: number;
    }> = [];

    const skus = await this.skuLookup(
      em,
      ordered.map((r) => r.productId),
    );

    for (const request of ordered) {
      const level = await this.lockLevel(em, tenantId, request.productId, warehouseId);
      const available = level.onHand - level.reserved;

      if (available < request.qty) {
        shortfalls.push({
          productId: request.productId,
          sku: skus.get(request.productId) ?? 'unknown',
          requested: request.qty,
          available,
        });
        continue;
      }

      await em.update(StockLevel, { id: level.id }, { reserved: level.reserved + request.qty });
    }

    // Collected rather than thrown on the first miss, so the UI can show every
    // problem line at once instead of one per retry.
    if (shortfalls.length > 0) throw new InsufficientStockError(shortfalls);
  }

  /** Gives reserved units back. Used by order cancellation. */
  async release(
    em: EntityManager,
    tenantId: string,
    warehouseId: string,
    requests: AllocationRequest[],
  ): Promise<void> {
    const ordered = [...requests].sort((a, b) => a.productId.localeCompare(b.productId));

    for (const request of ordered) {
      const level = await this.lockLevel(em, tenantId, request.productId, warehouseId);
      await em.update(
        StockLevel,
        { id: level.id },
        { reserved: Math.max(0, level.reserved - request.qty) },
      );
    }
  }

  /**
   * Ships reserved stock: drops the reservation and posts the issue movement
   * that actually removes the units from on-hand.
   */
  async issueReserved(
    em: EntityManager,
    tenantId: string,
    warehouseId: string,
    requests: AllocationRequest[],
    reference: { type: string; id: string },
    userId: string | null,
  ): Promise<void> {
    const ordered = [...requests].sort((a, b) => a.productId.localeCompare(b.productId));

    for (const request of ordered) {
      const level = await this.lockLevel(em, tenantId, request.productId, warehouseId);

      await em.update(
        StockLevel,
        { id: level.id },
        { reserved: Math.max(0, level.reserved - request.qty) },
      );

      await this.postMovement(
        {
          tenantId,
          productId: request.productId,
          warehouseId,
          type: MovementType.ISSUE,
          qtyDelta: -request.qty,
          referenceType: reference.type,
          referenceId: reference.id,
          userId,
        },
        em,
      );
    }
  }

  /** Adjusts on_order after a purchase order is sent, received or cancelled. */
  async adjustOnOrder(
    em: EntityManager,
    tenantId: string,
    warehouseId: string,
    requests: AllocationRequest[],
    direction: 1 | -1,
  ): Promise<void> {
    const ordered = [...requests].sort((a, b) => a.productId.localeCompare(b.productId));

    for (const request of ordered) {
      const level = await this.lockLevel(em, tenantId, request.productId, warehouseId);
      await em.update(
        StockLevel,
        { id: level.id },
        { onOrder: Math.max(0, level.onOrder + direction * request.qty) },
      );
    }
  }

  /**
   * Recomputes every running total from the ledger.
   *
   * stock_levels is a cache of a SUM over stock_movements, and any cache can
   * drift - a bad migration, a manual UPDATE, a bug in a new movement type.
   * This is the reconciliation job that proves the ledger is still the source
   * of truth. Reservations are left alone: they belong to open orders, not to
   * the movement history.
   */
  async rebuildLevels(tenantId: string): Promise<{ checked: number; corrected: number }> {
    const rows = await this.movements
      .createQueryBuilder('m')
      .select('m.product_id', 'productId')
      .addSelect('m.warehouse_id', 'warehouseId')
      .addSelect('SUM(m.qty_delta)', 'onHand')
      .addSelect('MAX(m.occurred_at)', 'lastMovementAt')
      .where('m.tenant_id = :tenantId', { tenantId })
      .groupBy('m.product_id')
      .addGroupBy('m.warehouse_id')
      .getRawMany<{
        productId: string;
        warehouseId: string;
        onHand: string;
        lastMovementAt: Date;
      }>();

    let corrected = 0;

    await this.dataSource.transaction(async (em) => {
      for (const row of rows) {
        const level = await this.lockLevel(em, tenantId, row.productId, row.warehouseId);
        const trueOnHand = Number(row.onHand);

        if (level.onHand !== trueOnHand) {
          this.logger.warn(
            {
              productId: row.productId,
              warehouseId: row.warehouseId,
              was: level.onHand,
              now: trueOnHand,
            },
            'stock level drifted from ledger, correcting',
          );
          await em.update(
            StockLevel,
            { id: level.id },
            { onHand: trueOnHand, lastMovementAt: row.lastMovementAt },
          );
          corrected += 1;
        }
      }
    });

    await this.invalidate(tenantId);
    return { checked: rows.length, corrected };
  }

  async levelsForProduct(tenantId: string, productId: string): Promise<StockLevel[]> {
    return this.levels.find({
      where: { tenantId, productId },
      relations: { warehouse: true },
      order: { warehouse: { code: 'ASC' } },
    });
  }

  async movementHistory(tenantId: string, productId: string, limit = 50): Promise<StockMovement[]> {
    return this.movements.find({
      where: { tenantId, productId },
      relations: { warehouse: true },
      order: { occurredAt: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Reads the level row with a row-level write lock, creating it on first
   * touch. The insert races with a concurrent first movement on the same pair,
   * so a unique-violation is treated as "someone else won" and we re-read.
   */
  private async lockLevel(
    em: EntityManager,
    tenantId: string,
    productId: string,
    warehouseId: string,
  ): Promise<StockLevel> {
    const existing = await em
      .createQueryBuilder(StockLevel, 'level')
      .setLock('pessimistic_write')
      .where('level.tenant_id = :tenantId', { tenantId })
      .andWhere('level.product_id = :productId', { productId })
      .andWhere('level.warehouse_id = :warehouseId', { warehouseId })
      .getOne();

    if (existing) return existing;

    await em
      .createQueryBuilder()
      .insert()
      .into(StockLevel)
      .values({
        tenantId,
        productId,
        warehouseId,
        onHand: 0,
        reserved: 0,
        onOrder: 0,
      })
      .orIgnore()
      .execute();

    const created = await em
      .createQueryBuilder(StockLevel, 'level')
      .setLock('pessimistic_write')
      .where('level.tenant_id = :tenantId', { tenantId })
      .andWhere('level.product_id = :productId', { productId })
      .andWhere('level.warehouse_id = :warehouseId', { warehouseId })
      .getOne();

    if (!created) throw new ResourceNotFoundError('StockLevel', `${productId}/${warehouseId}`);
    return created;
  }

  private async skuLookup(em: EntityManager, productIds: string[]): Promise<Map<string, string>> {
    if (productIds.length === 0) return new Map();
    const products = await em.find(Product, {
      where: { id: In(productIds) },
      select: { id: true, sku: true },
    });
    return new Map(products.map((p) => [p.id, p.sku]));
  }

  /**
   * Called by the order services once their transaction has committed. Doing
   * this inside the transaction would let a concurrent read repopulate the
   * cache with rows that are not visible yet.
   */
  async invalidate(tenantId: string): Promise<void> {
    await Promise.all([
      this.redis.forgetPattern(cacheKeys.tenantInventoryPattern(tenantId)),
      this.redis.forgetPattern(cacheKeys.tenantDashboardPattern(tenantId)),
      this.redis.forget(cacheKeys.replenishment(tenantId)),
    ]);
  }
}
