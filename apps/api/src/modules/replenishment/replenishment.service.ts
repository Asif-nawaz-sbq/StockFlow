import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from 'src/modules/products/entities/product.entity';
import { RedisService } from 'src/redis/redis.service';
import { cacheKeys, cacheTtl } from 'src/redis/cache-keys';

export interface ReplenishmentSuggestion {
  productId: string;
  sku: string;
  name: string;
  warehouseId: string;
  warehouseCode: string;
  onHand: number;
  reserved: number;
  onOrder: number;
  available: number;
  /** available + onOrder, i.e. what we will have once open POs land. */
  projected: number;
  reorderPoint: number;
  suggestedQty: number;
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
  leadTimeDays: number | null;
  estimatedCostCents: number | null;
}

interface SuggestionRow {
  productId: string;
  sku: string;
  name: string;
  warehouseId: string;
  warehouseCode: string;
  onHand: string;
  reserved: string;
  onOrder: string;
  reorderPoint: string;
  reorderQuantity: string;
  supplierId: string | null;
  supplierName: string | null;
  leadTimeDays: string | null;
  costPriceCents: string | null;
  minOrderQty: string | null;
}

@Injectable()
export class ReplenishmentService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly redis: RedisService,
  ) {}

  /**
   * Products whose projected stock has fallen below their reorder point.
   *
   * "Projected" counts what is already on an open purchase order, otherwise
   * every run would suggest reordering the same item until the goods physically
   * arrived. The preferred supplier is picked with DISTINCT ON so a product with
   * three suppliers yields one row, not three.
   */
  async suggestions(tenantId: string): Promise<ReplenishmentSuggestion[]> {
    return this.redis.remember(
      cacheKeys.replenishment(tenantId),
      cacheTtl.replenishment,
      async () => {
        const rows: SuggestionRow[] = await this.products.query(
          `
          WITH preferred AS (
            SELECT DISTINCT ON (ps.product_id)
                   ps.product_id,
                   ps.supplier_id,
                   ps.cost_price_cents,
                   ps.min_order_qty,
                   s.name         AS supplier_name,
                   s.lead_time_days
              FROM product_suppliers ps
              JOIN suppliers s ON s.id = ps.supplier_id AND s.is_active
             WHERE ps.tenant_id = $1
             ORDER BY ps.product_id, ps.is_preferred DESC, ps.cost_price_cents ASC
          )
          SELECT p.id                              AS "productId",
                 p.sku                             AS "sku",
                 p.name                            AS "name",
                 w.id                              AS "warehouseId",
                 w.code                            AS "warehouseCode",
                 sl.on_hand                        AS "onHand",
                 sl.reserved                       AS "reserved",
                 sl.on_order                       AS "onOrder",
                 p.reorder_point                   AS "reorderPoint",
                 p.reorder_quantity                AS "reorderQuantity",
                 pref.supplier_id                  AS "supplierId",
                 pref.supplier_name                AS "supplierName",
                 pref.lead_time_days               AS "leadTimeDays",
                 pref.cost_price_cents             AS "costPriceCents",
                 pref.min_order_qty                AS "minOrderQty"
            FROM stock_levels sl
            JOIN products   p ON p.id = sl.product_id
            JOIN warehouses w ON w.id = sl.warehouse_id
            LEFT JOIN preferred pref ON pref.product_id = p.id
           WHERE sl.tenant_id = $1
             AND p.is_active
             AND p.reorder_point > 0
             AND (sl.on_hand - sl.reserved + sl.on_order) < p.reorder_point
           ORDER BY (sl.on_hand - sl.reserved + sl.on_order)::numeric
                    / NULLIF(p.reorder_point, 0) ASC
           LIMIT 200
          `,
          [tenantId],
        );

        return rows.map((row) => this.toSuggestion(row));
      },
    );
  }

  private toSuggestion(row: SuggestionRow): ReplenishmentSuggestion {
    const onHand = Number(row.onHand);
    const reserved = Number(row.reserved);
    const onOrder = Number(row.onOrder);
    const available = onHand - reserved;
    const projected = available + onOrder;
    const reorderPoint = Number(row.reorderPoint);
    const reorderQuantity = Number(row.reorderQuantity);
    const minOrderQty = row.minOrderQty === null ? 1 : Math.max(1, Number(row.minOrderQty));

    // Cover the gap back up to the reorder point, then honour whichever is
    // larger: the product's own reorder quantity or the supplier's minimum.
    const gap = Math.max(0, reorderPoint - projected);
    const target = Math.max(gap, reorderQuantity, minOrderQty);
    const suggestedQty = Math.ceil(target / minOrderQty) * minOrderQty;

    const costPriceCents = row.costPriceCents === null ? null : Number(row.costPriceCents);

    return {
      productId: row.productId,
      sku: row.sku,
      name: row.name,
      warehouseId: row.warehouseId,
      warehouseCode: row.warehouseCode,
      onHand,
      reserved,
      onOrder,
      available,
      projected,
      reorderPoint,
      suggestedQty,
      preferredSupplierId: row.supplierId,
      preferredSupplierName: row.supplierName,
      leadTimeDays: row.leadTimeDays === null ? null : Number(row.leadTimeDays),
      estimatedCostCents: costPriceCents === null ? null : costPriceCents * suggestedQty,
    };
  }
}
