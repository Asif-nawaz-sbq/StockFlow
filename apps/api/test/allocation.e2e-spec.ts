import { InsufficientStockError } from 'src/common/errors/domain.errors';
import { StockLevel } from 'src/modules/inventory/entities/stock-level.entity';
import { MovementType } from 'src/modules/inventory/entities/stock-movement.entity';
import { SalesOrdersService } from 'src/modules/sales-orders/sales-orders.service';
import { SalesOrderStatus } from 'src/modules/sales-orders/entities/sales-order.entity';
import {
  TestContext,
  bootstrapTestContext,
  createProductWithStock,
  resetTenant,
} from './fixtures';

describe('stock allocation', () => {
  let ctx: TestContext;
  let orders: SalesOrdersService;

  beforeAll(async () => {
    ctx = await bootstrapTestContext();
    orders = ctx.app.get(SalesOrdersService);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetTenant(ctx);
  });

  const levelFor = (productId: string) =>
    ctx.dataSource.getRepository(StockLevel).findOneOrFail({
      where: { tenantId: ctx.tenantId, productId, warehouseId: ctx.warehouseId },
    });

  const draft = (productId: string, qty: number) =>
    orders.create(ctx.tenantId, ctx.userId, {
      customerId: ctx.customerId,
      warehouseId: ctx.warehouseId,
      lines: [{ productId, qty }],
    }, false);

  it('reserves stock on confirm without touching on-hand', async () => {
    const product = await createProductWithStock(ctx, 'ALLOC-1', 100);
    const order = await draft(product.id, 30);

    const confirmed = await orders.confirm(ctx.tenantId, ctx.userId, order.id);

    expect(confirmed.status).toBe(SalesOrderStatus.CONFIRMED);
    expect(confirmed.lines[0].allocatedQty).toBe(30);

    const level = await levelFor(product.id);
    expect(level.onHand).toBe(100);
    expect(level.reserved).toBe(30);
  });

  it('refuses to confirm more than is available and reports every short line', async () => {
    const product = await createProductWithStock(ctx, 'ALLOC-2', 10);
    const order = await draft(product.id, 25);

    await expect(orders.confirm(ctx.tenantId, ctx.userId, order.id)).rejects.toThrow(
      InsufficientStockError,
    );

    // The failed transaction must leave nothing behind.
    const level = await levelFor(product.id);
    expect(level.reserved).toBe(0);
    expect(level.onHand).toBe(10);
  });

  /**
   * The reason stock_levels rows are locked FOR UPDATE. Ten orders race for
   * six units each against ten units of stock: exactly one can win. Without
   * the lock both reads see on_hand=10, both pass the check, and the warehouse
   * is committed to selling stock it does not have.
   */
  it('lets exactly one of ten concurrent orders win the last units', async () => {
    const product = await createProductWithStock(ctx, 'ALLOC-3', 10);

    const drafts = await Promise.all(
      Array.from({ length: 10 }, () => draft(product.id, 6)),
    );

    const results = await Promise.allSettled(
      drafts.map((order) => orders.confirm(ctx.tenantId, ctx.userId, order.id)),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(9);

    const level = await levelFor(product.id);
    expect(level.reserved).toBe(6);
    expect(level.onHand).toBe(10);
  });

  it('releases the reservation when a confirmed order is cancelled', async () => {
    const product = await createProductWithStock(ctx, 'ALLOC-4', 50);
    const order = await draft(product.id, 20);

    await orders.confirm(ctx.tenantId, ctx.userId, order.id);
    expect((await levelFor(product.id)).reserved).toBe(20);

    const cancelled = await orders.cancel(ctx.tenantId, order.id, 'Kunde hat abbestellt');

    expect(cancelled.status).toBe(SalesOrderStatus.CANCELLED);
    const level = await levelFor(product.id);
    expect(level.reserved).toBe(0);
    expect(level.onHand).toBe(50);
  });

  it('drops on-hand only at ship time and writes one issue movement per line', async () => {
    const product = await createProductWithStock(ctx, 'ALLOC-5', 40);
    const order = await draft(product.id, 15);

    await orders.confirm(ctx.tenantId, ctx.userId, order.id);
    await orders.markPicked(ctx.tenantId, order.id);
    const shipped = await orders.ship(ctx.tenantId, ctx.userId, order.id);

    expect(shipped.status).toBe(SalesOrderStatus.SHIPPED);

    const level = await levelFor(product.id);
    expect(level.onHand).toBe(25);
    expect(level.reserved).toBe(0);

    const movements = await ctx.inventory.movementHistory(ctx.tenantId, product.id);
    const issues = movements.filter((m) => m.type === MovementType.ISSUE);
    expect(issues).toHaveLength(1);
    expect(issues[0].qtyDelta).toBe(-15);
    expect(issues[0].balanceAfter).toBe(25);
    expect(issues[0].referenceId).toBe(order.id);
  });

  it('rejects a state transition that skips confirmation', async () => {
    const product = await createProductWithStock(ctx, 'ALLOC-6', 20);
    const order = await draft(product.id, 5);

    await expect(orders.ship(ctx.tenantId, ctx.userId, order.id)).rejects.toMatchObject({
      response: { code: 'INVALID_STATE_TRANSITION' },
    });
  });
});
