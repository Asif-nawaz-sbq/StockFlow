import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The generated schema only carries a tenant FK on users, because that is the
 * one entity with an explicit @ManyToOne back to Tenant - the base class
 * deliberately omits the relation to avoid a circular import across every
 * entity in the app. Every other tenant_id column was therefore an unenforced
 * integer, which is exactly the kind of hole that lets a bad delete leave
 * orphaned rows behind in a multi-tenant schema.
 *
 * ON DELETE CASCADE: removing a tenant removes their data. There is no
 * soft-delete story for tenants and half-deleted workspaces are worse than
 * either extreme.
 */
const TENANT_OWNED_TABLES = [
  'warehouses',
  'suppliers',
  'customers',
  'products',
  'product_suppliers',
  'stock_movements',
  'stock_levels',
  'sales_orders',
  'sales_order_lines',
  'purchase_orders',
  'purchase_order_lines',
  'audit_logs',
  'idempotency_keys',
] as const;

const constraintName = (table: string): string => `fk_${table}_tenant`;

export class AddTenantForeignKeys1787378500000 implements MigrationInterface {
  name = 'AddTenantForeignKeys1787378500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TENANT_OWNED_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
           ADD CONSTRAINT "${constraintName(table)}"
           FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
           ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    // Hot path for the order list and the dashboard's open-order tiles.
    await queryRunner.query(
      `CREATE INDEX "idx_sales_orders_open"
         ON "sales_orders" ("tenant_id", "placed_at" DESC)
       WHERE "status" IN ('draft', 'confirmed', 'picked')`,
    );

    // Replenishment scans this predicate on every run.
    await queryRunner.query(
      `CREATE INDEX "idx_stock_levels_available"
         ON "stock_levels" ("tenant_id", (("on_hand" - "reserved") + "on_order"))`,
    );

    // Idempotency rows are swept by age; without this the cleanup is a seq scan.
    await queryRunner.query(
      `CREATE INDEX "idx_idempotency_keys_tenant_created"
         ON "idempotency_keys" ("tenant_id", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_idempotency_keys_tenant_created"`);
    await queryRunner.query(`DROP INDEX "public"."idx_stock_levels_available"`);
    await queryRunner.query(`DROP INDEX "public"."idx_sales_orders_open"`);

    for (const table of [...TENANT_OWNED_TABLES].reverse()) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${constraintName(table)}"`);
    }
  }
}
