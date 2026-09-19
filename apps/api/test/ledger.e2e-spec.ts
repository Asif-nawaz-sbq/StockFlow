import { StockLevel } from 'src/modules/inventory/entities/stock-level.entity';
import { MovementType } from 'src/modules/inventory/entities/stock-movement.entity';
import {
  TestContext,
  bootstrapTestContext,
  createProductWithStock,
  resetTenant,
} from './fixtures';

describe('inventory ledger', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await bootstrapTestContext();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetTenant(ctx);
  });

  it('stamps a running balance on every movement', async () => {
    const product = await createProductWithStock(ctx, 'LED-1', 100);

    await ctx.inventory.postMovement({
      tenantId: ctx.tenantId,
      productId: product.id,
      warehouseId: ctx.warehouseId,
      type: MovementType.SCRAP,
      qtyDelta: -12,
      note: 'Bruch',
      userId: ctx.userId,
    });

    await ctx.inventory.postMovement({
      tenantId: ctx.tenantId,
      productId: product.id,
      warehouseId: ctx.warehouseId,
      type: MovementType.RETURN,
      qtyDelta: 4,
      note: 'Retoure',
      userId: ctx.userId,
    });

    const history = await ctx.inventory.movementHistory(ctx.tenantId, product.id);
    const balances = history
      .slice()
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .map((m) => m.balanceAfter);

    expect(balances).toEqual([100, 88, 92]);
  });

  it('refuses a movement that would drive on-hand negative', async () => {
    const product = await createProductWithStock(ctx, 'LED-2', 5);

    await expect(
      ctx.inventory.postMovement({
        tenantId: ctx.tenantId,
        productId: product.id,
        warehouseId: ctx.warehouseId,
        type: MovementType.SCRAP,
        qtyDelta: -6,
        userId: ctx.userId,
      }),
    ).rejects.toMatchObject({ response: { code: 'INSUFFICIENT_STOCK' } });

    const level = await ctx.dataSource.getRepository(StockLevel).findOneOrFail({
      where: { tenantId: ctx.tenantId, productId: product.id },
    });
    expect(level.onHand).toBe(5);
  });

  /**
   * stock_levels is a cache of a SUM over the ledger. This proves the ledger
   * is authoritative: corrupt the cache by hand, then let the reconciliation
   * job put it back.
   */
  it('rebuilds running totals from the ledger and reports the drift', async () => {
    const product = await createProductWithStock(ctx, 'LED-3', 75);
    const repo = ctx.dataSource.getRepository(StockLevel);

    await repo.update(
      { tenantId: ctx.tenantId, productId: product.id },
      { onHand: 9_999 },
    );

    const result = await ctx.inventory.rebuildLevels(ctx.tenantId);

    expect(result.corrected).toBe(1);
    const level = await repo.findOneOrFail({
      where: { tenantId: ctx.tenantId, productId: product.id },
    });
    expect(level.onHand).toBe(75);
  });

  it('reports no drift when nothing is wrong', async () => {
    await createProductWithStock(ctx, 'LED-4', 30);
    const result = await ctx.inventory.rebuildLevels(ctx.tenantId);

    expect(result.checked).toBe(1);
    expect(result.corrected).toBe(0);
  });
});
