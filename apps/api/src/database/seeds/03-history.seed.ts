import { DataSource } from 'typeorm';
import { calculateLineTotals, sumOrderTotals } from 'src/common/money/money';
import { StockLevel } from 'src/modules/inventory/entities/stock-level.entity';
import { MovementType } from 'src/modules/inventory/entities/stock-movement.entity';
import { InventoryService } from 'src/modules/inventory/inventory.service';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { ProductSupplier } from 'src/modules/products/entities/product-supplier.entity';
import { PurchaseOrderLine } from 'src/modules/purchase-orders/entities/purchase-order-line.entity';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from 'src/modules/purchase-orders/entities/purchase-order.entity';
import { SalesOrderLine } from 'src/modules/sales-orders/entities/sales-order-line.entity';
import { SalesOrder, SalesOrderStatus } from 'src/modules/sales-orders/entities/sales-order.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';
import { createPrng, daysAgo } from './prng';

const HISTORY_DAYS = 90;
const PRNG_SEED = 20260401;

/**
 * Builds ninety days of trading history.
 *
 * Movements go through InventoryService.postMovement so the ledger and the
 * running totals are produced by exactly the same code the API uses - a seeder
 * that writes stock_levels directly would happily produce a state the app can
 * never reach. Orders themselves are written through the repositories rather
 * than SalesOrdersService, because the service stamps placedAt with the current
 * time and there is no sane way to backdate through it.
 */
export async function seedHistory(
  dataSource: DataSource,
  inventory: InventoryService,
  tenantId: string,
  products: Product[],
  customers: Customer[],
  warehouses: Warehouse[],
  users: User[],
): Promise<{ salesOrders: number; purchaseOrders: number; movements: number }> {
  const rng = createPrng(PRNG_SEED);
  const primary = warehouses[0];
  const secondary = warehouses[1];
  const clerk = users.find((u) => u.fullName === 'Dilara Ünal') ?? users[0];
  const opsManager = users.find((u) => u.fullName === 'Tim Osterkamp') ?? users[0];

  const links = await dataSource.getRepository(ProductSupplier).find({ where: { tenantId } });
  const costByProduct = new Map(links.map((l) => [l.productId, l.costPriceCents]));
  const supplierByProduct = new Map(links.map((l) => [l.productId, l.supplierId]));

  /**
   * Mirrors the running stock position so we never generate an order the
   * warehouse could not actually have fulfilled that day.
   *
   * Both halves are needed. Tracking on-hand alone would let the simulation
   * promise the same units to two different confirmed orders - InventoryService
   * enforces available = on_hand - reserved and rejects the second one, which
   * surfaced as InsufficientStockError partway through a seed run.
   */
  const onHand = new Map<string, number>();
  const reserved = new Map<string, number>();
  const key = (productId: string, warehouseId: string) => `${productId}|${warehouseId}`;
  const availableAt = (productId: string, warehouseId: string) =>
    (onHand.get(key(productId, warehouseId)) ?? 0) -
    (reserved.get(key(productId, warehouseId)) ?? 0);

  let movements = 0;
  let salesOrderCount = 0;
  let purchaseOrderCount = 0;
  let salesSeq = 0;
  let purchaseSeq = 0;
  const year = new Date().getUTCFullYear();

  await dataSource.transaction(async (em) => {
    // --- Opening stock, 90 days back -------------------------------------
    for (const product of products) {
      const base = Math.max(product.reorderPoint * 3, 60);
      const qty = rng.int(Math.round(base * 0.8), Math.round(base * 1.6));

      await inventory.postMovement(
        {
          tenantId,
          productId: product.id,
          warehouseId: primary.id,
          type: MovementType.RECEIPT,
          qtyDelta: qty,
          unitCostCents: costByProduct.get(product.id) ?? null,
          referenceType: 'opening_balance',
          note: 'Opening balance, system migration',
          occurredAt: daysAgo(HISTORY_DAYS, 7, 30),
          userId: clerk.id,
        },
        em,
      );
      onHand.set(key(product.id, primary.id), qty);
      movements += 1;

      // Only the faster-moving half of the range is stocked in Hamburg.
      if (rng.chance(0.45)) {
        const secondaryQty = rng.int(20, Math.max(30, Math.round(base * 0.5)));
        await inventory.postMovement(
          {
            tenantId,
            productId: product.id,
            warehouseId: secondary.id,
            type: MovementType.RECEIPT,
            qtyDelta: secondaryQty,
            unitCostCents: costByProduct.get(product.id) ?? null,
            referenceType: 'opening_balance',
            note: 'Opening balance, system migration',
            occurredAt: daysAgo(HISTORY_DAYS, 8, 15),
            userId: clerk.id,
          },
          em,
        );
        onHand.set(key(product.id, secondary.id), secondaryQty);
        movements += 1;
      }
    }

    // --- Day by day -------------------------------------------------------
    for (let day = HISTORY_DAYS - 1; day >= 0; day -= 1) {
      const date = daysAgo(day, 10, 0);
      const weekday = date.getUTCDay();
      const isWeekend = weekday === 0 || weekday === 6;

      // Restock roughly every ten days, plus a top-up for anything that has
      // dropped under its reorder point.
      if (day % 10 === 3) {
        purchaseSeq += 1;
        if (await createPurchaseOrder(day, purchaseSeq)) purchaseOrderCount += 1;
      }

      if (isWeekend) continue;

      const ordersToday = rng.int(0, 3);
      for (let i = 0; i < ordersToday; i += 1) {
        salesSeq += 1;
        const created = await createSalesOrder(day, salesSeq);
        if (created) salesOrderCount += 1;
      }
    }

    // --- Helpers ----------------------------------------------------------

    async function createPurchaseOrder(day: number, seq: number): Promise<boolean> {
      const needing = products.filter((p) => {
        const level = onHand.get(key(p.id, primary.id)) ?? 0;
        return level < p.reorderPoint * 1.4;
      });
      if (needing.length === 0) return false;

      // One PO per supplier, because a real buyer does not mix vendors.
      const supplierId = supplierByProduct.get(rng.pick(needing).id);
      if (!supplierId) return false;

      const lineProducts = needing
        .filter((p) => supplierByProduct.get(p.id) === supplierId)
        .slice(0, 6);
      if (lineProducts.length === 0) return false;

      const sentAt = daysAgo(day, 11, 0);
      const receivedAt = daysAgo(Math.max(0, day - rng.int(3, 8)), 8, 30);
      const fullyReceived = receivedAt < new Date();

      const poRepo = em.getRepository(PurchaseOrder);
      const poLineRepo = em.getRepository(PurchaseOrderLine);

      const lines = lineProducts.map((product) => {
        const qty = Math.max(product.reorderQuantity, 20);
        return poLineRepo.create({
          tenantId,
          productId: product.id,
          qtyOrdered: qty,
          qtyReceived: fullyReceived ? qty : 0,
          unitCostCents: costByProduct.get(product.id) ?? 1_000,
        });
      });

      const po = await poRepo.save(
        poRepo.create({
          tenantId,
          poNumber: `PO-${year}-${String(seq).padStart(5, '0')}`,
          supplierId,
          warehouseId: primary.id,
          status: fullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.SENT,
          currency: 'EUR',
          subtotalCents: lines.reduce((sum, l) => sum + l.unitCostCents * l.qtyOrdered, 0),
          expectedAt: receivedAt.toISOString().slice(0, 10),
          sentAt,
          receivedAt: fullyReceived ? receivedAt : null,
          createdByUserId: opsManager.id,
          lines,
        }),
      );

      if (fullyReceived) {
        for (const line of lines) {
          await inventory.postMovement(
            {
              tenantId,
              productId: line.productId,
              warehouseId: primary.id,
              type: MovementType.RECEIPT,
              qtyDelta: line.qtyOrdered,
              unitCostCents: line.unitCostCents,
              referenceType: 'purchase_order',
              referenceId: po.id,
              occurredAt: receivedAt,
              userId: clerk.id,
            },
            em,
          );
          const k = key(line.productId, primary.id);
          onHand.set(k, (onHand.get(k) ?? 0) + line.qtyOrdered);
          movements += 1;
        }
      } else {
        // Still in transit: counts towards on-order for replenishment.
        await inventory.adjustOnOrder(
          em,
          tenantId,
          primary.id,
          lines.map((l) => ({ productId: l.productId, qty: l.qtyOrdered })),
          1,
        );
      }

      return true;
    }

    async function createSalesOrder(day: number, seq: number): Promise<boolean> {
      const customer = rng.pick(customers);
      const warehouse = rng.chance(0.78) ? primary : secondary;
      const placedAt = daysAgo(day, rng.int(8, 17), rng.int(0, 59));

      const candidates = rng
        .shuffle(products)
        .filter((p) => availableAt(p.id, warehouse.id) > 5)
        .slice(0, rng.int(1, 5));

      if (candidates.length === 0) return false;

      // Older orders have run their course; recent ones are still in flight.
      const status = pickStatus(day);
      const consumesStock =
        status === SalesOrderStatus.SHIPPED ||
        status === SalesOrderStatus.CONFIRMED ||
        status === SalesOrderStatus.PICKED;

      const orderRepo = em.getRepository(SalesOrder);
      const lineRepo = em.getRepository(SalesOrderLine);

      const lines: SalesOrderLine[] = [];
      for (const product of candidates) {
        const available = availableAt(product.id, warehouse.id);
        const qty = Math.min(rng.int(2, 24), Math.max(0, Math.floor(available * 0.3)));
        if (qty <= 0) continue;

        // Bigger accounts negotiate a bit off list.
        const discount =
          customer.creditLimitCents > 1_000_000 && rng.chance(0.35) ? '5.00' : '0.00';
        const totals = calculateLineTotals(product.sellPriceCents, qty, product.vatRate, discount);

        lines.push(
          lineRepo.create({
            tenantId,
            productId: product.id,
            qty,
            allocatedQty: consumesStock ? qty : 0,
            unitPriceCents: product.sellPriceCents,
            discountPercent: discount,
            vatRate: product.vatRate,
            netCents: totals.netCents,
            vatCents: totals.vatCents,
            grossCents: totals.grossCents,
          }),
        );
      }

      if (lines.length === 0) return false;

      const totals = sumOrderTotals(
        lines.map((l) => ({
          netCents: l.netCents,
          vatCents: l.vatCents,
          grossCents: l.grossCents,
        })),
      );

      const shippedAt =
        status === SalesOrderStatus.SHIPPED
          ? daysAgo(Math.max(0, day - rng.int(1, 3)), 14, 0)
          : null;

      const order = await orderRepo.save(
        orderRepo.create({
          tenantId,
          orderNumber: `SO-${year}-${String(seq).padStart(5, '0')}`,
          customerId: customer.id,
          warehouseId: warehouse.id,
          status,
          currency: 'EUR',
          subtotalCents: totals.subtotalCents,
          vatTotalCents: totals.vatTotalCents,
          grandTotalCents: totals.grandTotalCents,
          placedAt,
          confirmedAt: consumesStock ? placedAt : null,
          shippedAt,
          cancelledAt: status === SalesOrderStatus.CANCELLED ? placedAt : null,
          cancellationReason:
            status === SalesOrderStatus.CANCELLED
              ? 'Cancelled by customer, delivery date too late'
              : null,
          createdByUserId: opsManager.id,
          lines,
        }),
      );

      if (status === SalesOrderStatus.SHIPPED && shippedAt) {
        for (const line of lines) {
          await inventory.postMovement(
            {
              tenantId,
              productId: line.productId,
              warehouseId: warehouse.id,
              type: MovementType.ISSUE,
              qtyDelta: -line.qty,
              referenceType: 'sales_order',
              referenceId: order.id,
              occurredAt: shippedAt,
              userId: clerk.id,
            },
            em,
          );
          const k = key(line.productId, warehouse.id);
          onHand.set(k, (onHand.get(k) ?? 0) - line.qty);
          movements += 1;
        }
      } else if (consumesStock) {
        for (const line of lines) {
          const k = key(line.productId, warehouse.id);
          reserved.set(k, (reserved.get(k) ?? 0) + line.qty);
        }
        // Confirmed or picked: stock is still physically here but promised.
        await inventory.reserve(
          em,
          tenantId,
          warehouse.id,
          lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        );
      }

      return true;
    }

    function pickStatus(day: number): SalesOrderStatus {
      if (day > 10) {
        return rng.chance(0.93) ? SalesOrderStatus.SHIPPED : SalesOrderStatus.CANCELLED;
      }
      if (day > 4) {
        return rng.chance(0.7) ? SalesOrderStatus.SHIPPED : SalesOrderStatus.PICKED;
      }
      if (day > 1) {
        return rng.chance(0.55) ? SalesOrderStatus.CONFIRMED : SalesOrderStatus.PICKED;
      }
      return rng.chance(0.5) ? SalesOrderStatus.DRAFT : SalesOrderStatus.CONFIRMED;
    }
  });

  // A handful of stock counts, so the ledger is not purely order-driven.
  await applyStockCounts(dataSource, inventory, tenantId, products, primary.id, clerk.id, rng);

  await inventory.invalidate(tenantId);

  return { salesOrders: salesOrderCount, purchaseOrders: purchaseOrderCount, movements };
}

async function applyStockCounts(
  dataSource: DataSource,
  inventory: InventoryService,
  tenantId: string,
  products: Product[],
  warehouseId: string,
  userId: string,
  rng: ReturnType<typeof createPrng>,
): Promise<void> {
  const levelRepo = dataSource.getRepository(StockLevel);

  for (const product of rng.shuffle(products).slice(0, 5)) {
    const level = await levelRepo.findOne({
      where: { tenantId, productId: product.id, warehouseId },
    });
    if (!level) continue;

    const spare = level.onHand - level.reserved;
    if (spare < 4) continue;

    const delta = rng.chance(0.6) ? -rng.int(1, Math.min(3, spare)) : rng.int(1, 4);

    await inventory.postMovement({
      tenantId,
      productId: product.id,
      warehouseId,
      type: delta < 0 ? MovementType.SCRAP : MovementType.ADJUSTMENT,
      qtyDelta: delta,
      referenceType: 'stock_count',
      note: delta < 0 ? 'Breakage during picking' : 'Correction after stock count',
      occurredAt: daysAgo(rng.int(1, 20), 16, 30),
      userId,
    });
  }
}
