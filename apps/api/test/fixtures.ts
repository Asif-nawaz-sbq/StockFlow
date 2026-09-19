import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AuthService } from 'src/modules/auth/auth.service';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { MovementType } from 'src/modules/inventory/entities/stock-movement.entity';
import { InventoryService } from 'src/modules/inventory/inventory.service';
import { Product, ProductUnit, VatRate } from 'src/modules/products/entities/product.entity';
import { Role, RoleKey } from 'src/modules/rbac/entities/role.entity';
import { Tenant, TenantPlan } from 'src/modules/tenants/entities/tenant.entity';
import { User, UserStatus } from 'src/modules/users/entities/user.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';
import { seedRbac } from 'src/database/seeds/00-rbac.seed';

export interface TestContext {
  app: INestApplicationContext;
  dataSource: DataSource;
  inventory: InventoryService;
  tenantId: string;
  warehouseId: string;
  userId: string;
  customerId: string;
  roles: Map<RoleKey, Role>;
}

const TENANT_TABLES = [
  'audit_logs',
  'idempotency_keys',
  'sales_order_lines',
  'sales_orders',
  'purchase_order_lines',
  'purchase_orders',
  'stock_movements',
  'stock_levels',
  'product_suppliers',
  'products',
  'customers',
  'suppliers',
  'warehouses',
  'user_roles',
  'users',
  'tenants',
];

export async function bootstrapTestContext(): Promise<TestContext> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const dataSource = app.get(DataSource);

  await dataSource.runMigrations();

  return {
    app,
    dataSource,
    inventory: app.get(InventoryService),
    tenantId: '',
    warehouseId: '',
    userId: '',
    customerId: '',
    roles: await seedRbac(dataSource),
  };
}

export async function resetTenant(ctx: TestContext): Promise<void> {
  await ctx.dataSource.query(
    `TRUNCATE TABLE ${TENANT_TABLES.map((t) => `"${t}"`).join(', ')} CASCADE`,
  );

  const tenant = await ctx.dataSource.getRepository(Tenant).save({
    slug: 'testwerk',
    name: 'Testwerk Handel GmbH',
    vatId: 'DE100000001',
    country: 'DE',
    plan: TenantPlan.STANDARD,
    defaultCurrency: 'EUR',
    isActive: true,
  });

  const warehouse = await ctx.dataSource.getRepository(Warehouse).save({
    tenantId: tenant.id,
    code: 'TST-01',
    name: 'Testlager',
    addressLine1: 'Teststraße 1',
    postalCode: '40213',
    city: 'Düsseldorf',
    country: 'DE',
    isActive: true,
  });

  const user = await ctx.dataSource.getRepository(User).save({
    tenantId: tenant.id,
    email: 'test.owner@testwerk.de',
    fullName: 'Test Owner',
    passwordHash: await AuthService.hashPassword('IntegrationTest1!'),
    status: UserStatus.ACTIVE,
    roles: [ctx.roles.get(RoleKey.OWNER) as Role],
  });

  const customer = await ctx.dataSource.getRepository(Customer).save({
    tenantId: tenant.id,
    code: 'KND-TEST',
    name: 'Testkunde AG',
    billingAddressLine1: 'Kundenweg 5',
    billingPostalCode: '50667',
    billingCity: 'Köln',
    billingCountry: 'DE',
    // No limit, so credit checks never mask a stock assertion.
    creditLimitCents: 0,
    paymentTermsDays: 14,
    isActive: true,
  });

  ctx.tenantId = tenant.id;
  ctx.warehouseId = warehouse.id;
  ctx.userId = user.id;
  ctx.customerId = customer.id;
}

export async function createProductWithStock(
  ctx: TestContext,
  sku: string,
  onHand: number,
  sellPriceCents = 1_000,
): Promise<Product> {
  const product = await ctx.dataSource.getRepository(Product).save({
    tenantId: ctx.tenantId,
    sku,
    name: `Testartikel ${sku}`,
    category: 'Test',
    unit: ProductUnit.PIECE,
    sellPriceCents,
    currency: 'EUR',
    vatRate: VatRate.STANDARD,
    reorderPoint: 0,
    reorderQuantity: 0,
    isActive: true,
  });

  if (onHand > 0) {
    await ctx.inventory.postMovement({
      tenantId: ctx.tenantId,
      productId: product.id,
      warehouseId: ctx.warehouseId,
      type: MovementType.RECEIPT,
      qtyDelta: onHand,
      unitCostCents: Math.round(sellPriceCents * 0.6),
      referenceType: 'test_fixture',
      userId: ctx.userId,
    });
  }

  return product;
}
