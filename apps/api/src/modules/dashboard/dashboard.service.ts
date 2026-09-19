import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesOrder, SalesOrderStatus } from 'src/modules/sales-orders/entities/sales-order.entity';
import { StockMovement } from 'src/modules/inventory/entities/stock-movement.entity';
import { RedisService } from 'src/redis/redis.service';
import { cacheKeys, cacheTtl } from 'src/redis/cache-keys';

export interface DashboardSummary {
  stockValueCents: number;
  distinctSkusInStock: number;
  lowStockCount: number;
  openOrderCount: number;
  openOrderValueCents: number;
  shippedThisMonthCount: number;
  shippedThisMonthValueCents: number;
  /** Net revenue of shipped orders, last 14 days, oldest first. */
  revenueTrend: Array<{ date: string; netCents: number }>;
  topProducts: Array<{
    sku: string;
    name: string;
    unitsShipped: number;
    netCents: number;
  }>;
  generatedAt: string;
}

export interface RecentMovement {
  id: string;
  occurredAt: string;
  type: string;
  qtyDelta: number;
  balanceAfter: number;
  sku: string;
  productName: string;
  warehouseCode: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(SalesOrder)
    private readonly orders: Repository<SalesOrder>,
    @InjectRepository(StockMovement)
    private readonly movements: Repository<StockMovement>,
    private readonly redis: RedisService,
  ) {}

  /**
   * Six aggregates over the whole tenant. Cached for a minute because the
   * dashboard is the landing page - without it every login runs five sequential
   * scans, which is the difference between a snappy page and a visible spinner.
   */
  async summary(tenantId: string): Promise<DashboardSummary> {
    return this.redis.remember(
      cacheKeys.dashboardSummary(tenantId),
      cacheTtl.dashboard,
      async () => {
        const [stock, orders, shipped, trend, top] = await Promise.all([
          this.stockSnapshot(tenantId),
          this.openOrders(tenantId),
          this.shippedThisMonth(tenantId),
          this.revenueTrend(tenantId),
          this.topProducts(tenantId),
        ]);

        return {
          ...stock,
          ...orders,
          ...shipped,
          revenueTrend: trend,
          topProducts: top,
          generatedAt: new Date().toISOString(),
        };
      },
    );
  }

  async recentMovements(tenantId: string, limit = 15): Promise<RecentMovement[]> {
    const rows = await this.movements.query(
      `SELECT m.id,
              m.occurred_at    AS "occurredAt",
              m.type,
              m.qty_delta      AS "qtyDelta",
              m.balance_after  AS "balanceAfter",
              p.sku,
              p.name           AS "productName",
              w.code           AS "warehouseCode"
         FROM stock_movements m
         JOIN products   p ON p.id = m.product_id
         JOIN warehouses w ON w.id = m.warehouse_id
        WHERE m.tenant_id = $1
        ORDER BY m.occurred_at DESC, m.created_at DESC
        LIMIT $2`,
      [tenantId, limit],
    );
    return rows as RecentMovement[];
  }

  /**
   * Stock is valued at the latest receipt cost per product rather than a moving
   * average - it is the number the warehouse team recognises, and it needs no
   * extra columns on stock_levels.
   */
  private async stockSnapshot(
    tenantId: string,
  ): Promise<Pick<DashboardSummary, 'stockValueCents' | 'distinctSkusInStock' | 'lowStockCount'>> {
    const [row] = await this.movements.query(
      `WITH last_cost AS (
         SELECT DISTINCT ON (product_id) product_id, unit_cost_cents
           FROM stock_movements
          WHERE tenant_id = $1 AND unit_cost_cents IS NOT NULL
          ORDER BY product_id, occurred_at DESC
       )
       SELECT COALESCE(SUM(sl.on_hand * COALESCE(lc.unit_cost_cents, 0)), 0)::bigint AS "stockValueCents",
              COUNT(*) FILTER (WHERE sl.on_hand > 0)                                 AS "distinctSkusInStock",
              COUNT(*) FILTER (
                WHERE p.reorder_point > 0
                  AND (sl.on_hand - sl.reserved + sl.on_order) < p.reorder_point
              )                                                                      AS "lowStockCount"
         FROM stock_levels sl
         JOIN products p ON p.id = sl.product_id AND p.is_active
         LEFT JOIN last_cost lc ON lc.product_id = sl.product_id
        WHERE sl.tenant_id = $1`,
      [tenantId],
    );

    return {
      stockValueCents: Number(row?.stockValueCents ?? 0),
      distinctSkusInStock: Number(row?.distinctSkusInStock ?? 0),
      lowStockCount: Number(row?.lowStockCount ?? 0),
    };
  }

  private async openOrders(
    tenantId: string,
  ): Promise<Pick<DashboardSummary, 'openOrderCount' | 'openOrderValueCents'>> {
    const row = await this.orders
      .createQueryBuilder('o')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.grand_total_cents), 0)', 'value')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.status IN (:...statuses)', {
        statuses: [SalesOrderStatus.DRAFT, SalesOrderStatus.CONFIRMED, SalesOrderStatus.PICKED],
      })
      .getRawOne<{ count: string; value: string }>();

    return {
      openOrderCount: Number(row?.count ?? 0),
      openOrderValueCents: Number(row?.value ?? 0),
    };
  }

  private async shippedThisMonth(
    tenantId: string,
  ): Promise<Pick<DashboardSummary, 'shippedThisMonthCount' | 'shippedThisMonthValueCents'>> {
    const row = await this.orders
      .createQueryBuilder('o')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.grand_total_cents), 0)', 'value')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.status = :status', { status: SalesOrderStatus.SHIPPED })
      .andWhere("o.shipped_at >= date_trunc('month', now())")
      .getRawOne<{ count: string; value: string }>();

    return {
      shippedThisMonthCount: Number(row?.count ?? 0),
      shippedThisMonthValueCents: Number(row?.value ?? 0),
    };
  }

  /** generate_series so days with no shipments still appear as zero on the chart. */
  private async revenueTrend(tenantId: string): Promise<Array<{ date: string; netCents: number }>> {
    const rows = await this.orders.query(
      `SELECT to_char(d.day, 'YYYY-MM-DD')                       AS "date",
              COALESCE(SUM(o.subtotal_cents), 0)::bigint          AS "netCents"
         FROM generate_series(
                date_trunc('day', now()) - interval '13 days',
                date_trunc('day', now()),
                interval '1 day'
              ) AS d(day)
         LEFT JOIN sales_orders o
                ON o.tenant_id = $1
               AND o.status = 'shipped'
               AND date_trunc('day', o.shipped_at) = d.day
        GROUP BY d.day
        ORDER BY d.day ASC`,
      [tenantId],
    );

    return (rows as Array<{ date: string; netCents: string }>).map((row) => ({
      date: row.date,
      netCents: Number(row.netCents),
    }));
  }

  private async topProducts(
    tenantId: string,
  ): Promise<Array<{ sku: string; name: string; unitsShipped: number; netCents: number }>> {
    const rows = await this.orders.query(
      `SELECT p.sku,
              p.name,
              SUM(l.qty)::int          AS "unitsShipped",
              SUM(l.net_cents)::bigint AS "netCents"
         FROM sales_order_lines l
         JOIN sales_orders o ON o.id = l.order_id
         JOIN products     p ON p.id = l.product_id
        WHERE o.tenant_id = $1
          AND o.status = 'shipped'
          AND o.shipped_at >= now() - interval '90 days'
        GROUP BY p.sku, p.name
        ORDER BY "netCents" DESC
        LIMIT 5`,
      [tenantId],
    );

    return (
      rows as Array<{
        sku: string;
        name: string;
        unitsShipped: string;
        netCents: string;
      }>
    ).map((row) => ({
      sku: row.sku,
      name: row.name,
      unitsShipped: Number(row.unitsShipped),
      netCents: Number(row.netCents),
    }));
  }
}
