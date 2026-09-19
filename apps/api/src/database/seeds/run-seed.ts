import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from 'src/app.module';
import { InventoryService } from 'src/modules/inventory/inventory.service';
import { seedRbac } from './00-rbac.seed';
import { seedWorkspace } from './01-workspace.seed';
import { seedCatalogue } from './02-catalogue.seed';
import { seedHistory } from './03-history.seed';

/**
 * Wipes the tenant-scoped tables and rebuilds them. Roles and permissions are
 * upserted rather than truncated because they are reference data.
 *
 * Refuses to run against production. Losing a demo database is an
 * inconvenience; the same command pointed at a live workspace is not.
 */
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

async function main(): Promise<void> {
  const logger = new Logger('seed');

  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'yes') {
    logger.error(
      'Refusing to seed with NODE_ENV=production. Set SEED_ALLOW_PRODUCTION=yes to override.',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const inventory = app.get(InventoryService);

    logger.log('truncating tenant data');
    await dataSource.query(
      `TRUNCATE TABLE ${TENANT_TABLES.map((t) => `"${t}"`).join(', ')} CASCADE`,
    );

    logger.log('roles and permissions');
    const roles = await seedRbac(dataSource);

    logger.log('workspace, staff and warehouses');
    const { tenant, warehouses, users } = await seedWorkspace(dataSource, roles);

    logger.log('suppliers, products and customers');
    const { products, customers } = await seedCatalogue(dataSource, tenant.id);

    logger.log('ninety days of trading history (this takes a moment)');
    const stats = await seedHistory(
      dataSource,
      inventory,
      tenant.id,
      products,
      customers,
      warehouses,
      users,
    );

    logger.log(
      `done: ${products.length} products, ${customers.length} customers, ` +
        `${stats.salesOrders} sales orders, ${stats.purchaseOrders} purchase orders, ` +
        `${stats.movements} stock movements`,
    );
    logger.log(`sign in as ${users[0].email} with the password from SEED_OWNER_PASSWORD`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  new Logger('seed').error(error);
  process.exit(1);
});
