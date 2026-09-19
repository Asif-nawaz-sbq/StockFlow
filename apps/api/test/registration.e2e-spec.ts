import { DuplicateResourceError } from 'src/common/errors/domain.errors';
import { Product } from 'src/modules/products/entities/product.entity';
import { RegistrationService } from 'src/modules/auth/registration.service';
import { RoleKey } from 'src/modules/rbac/entities/role.entity';
import { Tenant } from 'src/modules/tenants/entities/tenant.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';
import { ProductsService } from 'src/modules/products/products.service';
import { ProductUnit, VatRate } from 'src/modules/products/entities/product.entity';
import {
  TestContext,
  bootstrapTestContext,
  createProductWithStock,
  resetTenant,
} from './fixtures';

describe('workspace registration', () => {
  let ctx: TestContext;
  let registration: RegistrationService;
  let products: ProductsService;

  beforeAll(async () => {
    ctx = await bootstrapTestContext();
    registration = ctx.app.get(RegistrationService);
    products = ctx.app.get(ProductsService);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await resetTenant(ctx);
  });

  const signUp = (email: string, company = 'Harbourline Trading Ltd') =>
    registration.register({
      companyName: company,
      fullName: 'Jordan Blake',
      email,
      password: 'Harbour2026x',
    });

  it('creates a tenant, an owner and a starter warehouse in one go', async () => {
    const { tenantId, userId } = await signUp('jordan@harbourline.test');

    const tenant = await ctx.dataSource
      .getRepository(Tenant)
      .findOneOrFail({ where: { id: tenantId } });
    expect(tenant.name).toBe('Harbourline Trading Ltd');
    expect(tenant.slug).toBe('harbourline-trading-ltd');

    const user = await ctx.dataSource
      .getRepository(User)
      .findOneOrFail({ where: { id: userId } });
    expect(user.tenantId).toBe(tenantId);
    expect(user.roles.map((r) => r.key)).toEqual([RoleKey.OWNER]);

    // Without a warehouse almost nothing in the app works, so registration
    // seeds one rather than letting the first order fail.
    const warehouses = await ctx.dataSource
      .getRepository(Warehouse)
      .find({ where: { tenantId } });
    expect(warehouses).toHaveLength(1);
    expect(warehouses[0].code).toBe('MAIN');
  });

  it('rejects an email that already has an account', async () => {
    await signUp('taken@harbourline.test');
    await expect(signUp('taken@harbourline.test', 'Another Co')).rejects.toThrow(
      DuplicateResourceError,
    );
  });

  it('gives two companies with the same name distinct slugs', async () => {
    const first = await signUp('one@harbourline.test');
    const second = await signUp('two@harbourline.test');

    const repo = ctx.dataSource.getRepository(Tenant);
    const a = await repo.findOneOrFail({ where: { id: first.tenantId } });
    const b = await repo.findOneOrFail({ where: { id: second.tenantId } });

    expect(a.slug).toBe('harbourline-trading-ltd');
    expect(b.slug).toBe('harbourline-trading-ltd-2');
  });

  /**
   * The whole point of the tenant column. A new workspace must not be able to
   * see the fixture tenant's catalogue, and vice versa.
   */
  it('keeps a new workspace isolated from existing tenants', async () => {
    await createProductWithStock(ctx, 'ISO-1', 25);

    const { tenantId } = await signUp('isolated@harbourline.test');

    const theirs = await products.list(tenantId, {
      page: 1,
      pageSize: 25,
      sortDir: 'DESC',
      sortBy: 'sku',
      skip: 0,
    });
    expect(theirs.meta.total).toBe(0);

    const ours = await products.list(ctx.tenantId, {
      page: 1,
      pageSize: 25,
      sortDir: 'DESC',
      sortBy: 'sku',
      skip: 0,
    });
    expect(ours.meta.total).toBe(1);

    // And a product created in the new workspace stays there.
    await ctx.dataSource.getRepository(Product).save({
      tenantId,
      sku: 'THEIRS-1',
      name: 'Their product',
      category: 'Test',
      unit: ProductUnit.PIECE,
      sellPriceCents: 500,
      currency: 'EUR',
      vatRate: VatRate.STANDARD,
      isActive: true,
    });

    const oursAgain = await products.list(ctx.tenantId, {
      page: 1,
      pageSize: 25,
      sortDir: 'DESC',
      sortBy: 'sku',
      skip: 0,
    });
    expect(oursAgain.data.map((p) => p.sku)).toEqual(['ISO-1']);
  });
});
