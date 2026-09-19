import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1787378416219 implements MigrationInterface {
  name = 'InitialSchema1787378416219';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "idempotency_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "key" character varying(128) NOT NULL, "endpoint" character varying(200) NOT NULL, "request_hash" character varying(64) NOT NULL, "response_status" integer, "response_body" jsonb, "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uq_idempotency_keys_tenant_key" UNIQUE ("tenant_id", "key"), CONSTRAINT "PK_8ad20779ad0411107a56e53d0f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c22d37ec13b71da74d7b4372c3" ON "idempotency_keys" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_idempotency_keys_created" ON "idempotency_keys" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "key" character varying(64) NOT NULL, "description" character varying(160) NOT NULL, CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_017943867ed5ceef9c03edd974" ON "permissions" ("key") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."roles_key_enum" AS ENUM('owner', 'ops_manager', 'warehouse_clerk', 'viewer')`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "key" "public"."roles_key_enum" NOT NULL, "name" character varying(80) NOT NULL, "description" character varying(200) NOT NULL, CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a87cf0659c3ac379b339acf36a" ON "roles" ("key") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenants_plan_enum" AS ENUM('trial', 'standard', 'enterprise')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "slug" character varying(64) NOT NULL, "name" character varying(160) NOT NULL, "vat_id" character varying(32), "country" character varying(2) NOT NULL DEFAULT 'DE', "plan" "public"."tenants_plan_enum" NOT NULL DEFAULT 'trial', "default_currency" character varying(3) NOT NULL DEFAULT 'EUR', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2310ecc5cb8be427097154b18f" ON "tenants" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('invited', 'active', 'disabled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "full_name" character varying(160) NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'invited', "last_login_at" TIMESTAMP WITH TIME ZONE, "token_version" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_109638590074998bb72a2f2cf0" ON "users" ("tenant_id") `,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") `);
    await queryRunner.query(
      `CREATE INDEX "idx_users_tenant_email" ON "users" ("tenant_id", "email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "warehouses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "code" character varying(16) NOT NULL, "name" character varying(120) NOT NULL, "address_line1" character varying(160) NOT NULL, "postal_code" character varying(16) NOT NULL, "city" character varying(80) NOT NULL, "country" character varying(2) NOT NULL DEFAULT 'DE', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "uq_warehouses_tenant_code" UNIQUE ("tenant_id", "code"), CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_09106b8068aeaf74fa33666df8" ON "warehouses" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "suppliers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "code" character varying(16) NOT NULL, "name" character varying(160) NOT NULL, "contact_name" character varying(120), "contact_email" character varying(255), "contact_phone" character varying(40), "country" character varying(2) NOT NULL DEFAULT 'DE', "vat_id" character varying(32), "lead_time_days" integer NOT NULL DEFAULT '7', "payment_terms_days" integer NOT NULL DEFAULT '30', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "uq_suppliers_tenant_code" UNIQUE ("tenant_id", "code"), CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b0d0350059126fa08fddc3c7a4" ON "suppliers" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "code" character varying(16) NOT NULL, "name" character varying(160) NOT NULL, "contact_name" character varying(120), "email" character varying(255), "phone" character varying(40), "vat_id" character varying(32), "billing_address_line1" character varying(160) NOT NULL, "billing_postal_code" character varying(16) NOT NULL, "billing_city" character varying(80) NOT NULL, "billing_country" character varying(2) NOT NULL DEFAULT 'DE', "credit_limit_cents" integer NOT NULL DEFAULT '0', "payment_terms_days" integer NOT NULL DEFAULT '14', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "uq_customers_tenant_code" UNIQUE ("tenant_id", "code"), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97913f35ac2e435a4463fb50a0" ON "customers" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_suppliers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "product_id" uuid NOT NULL, "supplier_id" uuid NOT NULL, "supplier_sku" character varying(60), "cost_price_cents" integer NOT NULL, "min_order_qty" integer NOT NULL DEFAULT '1', "is_preferred" boolean NOT NULL DEFAULT false, CONSTRAINT "uq_product_suppliers_pair" UNIQUE ("product_id", "supplier_id"), CONSTRAINT "PK_96f9e4cfe1a097fdd2a9a67257a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_574f802b0db02d671aa366aa04" ON "product_suppliers" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_unit_enum" AS ENUM('piece', 'box', 'pallet', 'kg', 'l')`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "sku" character varying(40) NOT NULL, "name" character varying(200) NOT NULL, "description" text, "category" character varying(80) NOT NULL, "ean" character varying(14), "unit" "public"."products_unit_enum" NOT NULL DEFAULT 'piece', "sell_price_cents" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'EUR', "vat_rate" numeric(5,2) NOT NULL DEFAULT '19.00', "reorder_point" integer NOT NULL DEFAULT '0', "reorder_quantity" integer NOT NULL DEFAULT '0', "weight_grams" integer, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "uq_products_tenant_sku" UNIQUE ("tenant_id", "sku"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c365ebf78f0e8a6d9e4827ea7" ON "products" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_tenant_active" ON "products" ("tenant_id", "is_active") `,
    );
    await queryRunner.query(
      `CREATE TABLE "sales_order_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "qty" integer NOT NULL, "allocated_qty" integer NOT NULL DEFAULT '0', "unit_price_cents" integer NOT NULL, "discount_percent" numeric(5,2) NOT NULL DEFAULT '0.00', "vat_rate" numeric(5,2) NOT NULL, "net_cents" integer NOT NULL, "vat_cents" integer NOT NULL, "gross_cents" integer NOT NULL, CONSTRAINT "uq_sales_order_lines_order_product" UNIQUE ("order_id", "product_id"), CONSTRAINT "ck_sales_order_lines_allocated_within_qty" CHECK ("allocated_qty" <= "qty"), CONSTRAINT "ck_sales_order_lines_qty_positive" CHECK ("qty" > 0), CONSTRAINT "PK_91a9fd0ffdb8572374cf89df4da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fe460d031e961e9e3801ed0ed9" ON "sales_order_lines" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sales_orders_status_enum" AS ENUM('draft', 'confirmed', 'picked', 'shipped', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sales_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "order_number" character varying(24) NOT NULL, "customer_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "status" "public"."sales_orders_status_enum" NOT NULL DEFAULT 'draft', "currency" character varying(3) NOT NULL DEFAULT 'EUR', "subtotal_cents" integer NOT NULL DEFAULT '0', "vat_total_cents" integer NOT NULL DEFAULT '0', "grand_total_cents" integer NOT NULL DEFAULT '0', "placed_at" TIMESTAMP WITH TIME ZONE NOT NULL, "confirmed_at" TIMESTAMP WITH TIME ZONE, "shipped_at" TIMESTAMP WITH TIME ZONE, "cancelled_at" TIMESTAMP WITH TIME ZONE, "cancellation_reason" text, "notes" text, "created_by_user_id" uuid, CONSTRAINT "uq_sales_orders_tenant_number" UNIQUE ("tenant_id", "order_number"), CONSTRAINT "PK_5328297e067ca929fbe7cf989dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77e3868b735c09c41f48951170" ON "sales_orders" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sales_orders_placed_at" ON "sales_orders" ("tenant_id", "placed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sales_orders_tenant_status" ON "sales_orders" ("tenant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "purchase_order_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "purchase_order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "qty_ordered" integer NOT NULL, "qty_received" integer NOT NULL DEFAULT '0', "unit_cost_cents" integer NOT NULL, CONSTRAINT "uq_purchase_order_lines_po_product" UNIQUE ("purchase_order_id", "product_id"), CONSTRAINT "ck_po_lines_received_within_ordered" CHECK ("qty_received" <= "qty_ordered"), CONSTRAINT "ck_po_lines_qty_positive" CHECK ("qty_ordered" > 0), CONSTRAINT "PK_34a2082d2abb10c5d8713bc19b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c07c8a298555beb9a5064d53da" ON "purchase_order_lines" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."purchase_orders_status_enum" AS ENUM('draft', 'sent', 'partially_received', 'received', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "purchase_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "po_number" character varying(24) NOT NULL, "supplier_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "status" "public"."purchase_orders_status_enum" NOT NULL DEFAULT 'draft', "currency" character varying(3) NOT NULL DEFAULT 'EUR', "subtotal_cents" integer NOT NULL DEFAULT '0', "expected_at" date, "sent_at" TIMESTAMP WITH TIME ZONE, "received_at" TIMESTAMP WITH TIME ZONE, "notes" text, "created_by_user_id" uuid, CONSTRAINT "uq_purchase_orders_tenant_number" UNIQUE ("tenant_id", "po_number"), CONSTRAINT "PK_05148947415204a897e8beb2553" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_237678c98436e0abb48b3060c8" ON "purchase_orders" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_purchase_orders_tenant_status" ON "purchase_orders" ("tenant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_levels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "product_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "on_hand" integer NOT NULL DEFAULT '0', "reserved" integer NOT NULL DEFAULT '0', "on_order" integer NOT NULL DEFAULT '0', "last_movement_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "uq_stock_levels_product_wh" UNIQUE ("product_id", "warehouse_id"), CONSTRAINT "ck_stock_levels_reserved_within_on_hand" CHECK ("reserved" <= "on_hand"), CONSTRAINT "ck_stock_levels_reserved_non_negative" CHECK ("reserved" >= 0), CONSTRAINT "ck_stock_levels_on_hand_non_negative" CHECK ("on_hand" >= 0), CONSTRAINT "PK_ee416fdf2f5696dff16fd0c1c90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_703e27532235de1937132c8ab4" ON "stock_levels" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_type_enum" AS ENUM('receipt', 'issue', 'adjustment', 'return', 'transfer_out', 'transfer_in', 'scrap')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "product_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "type" "public"."stock_movements_type_enum" NOT NULL, "qty_delta" integer NOT NULL, "balance_after" integer NOT NULL, "unit_cost_cents" integer, "reference_type" character varying(32), "reference_id" uuid, "note" text, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_by_user_id" uuid, CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_30dd9acc22dcb6ae51d7d34f16" ON "stock_movements" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_stock_movements_reference" ON "stock_movements" ("reference_type", "reference_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_stock_movements_product_wh" ON "stock_movements" ("product_id", "warehouse_id", "occurred_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenant_id" uuid NOT NULL, "actor_user_id" uuid, "actor_email" character varying(255), "action" character varying(80) NOT NULL, "entity_type" character varying(60), "entity_id" uuid, "changes" jsonb, "request_id" character varying(64), "ip_address" character varying(64), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f18d459490bb48923b1f40bdb" ON "audit_logs" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_tenant_created" ON "audit_logs" ("tenant_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_roles" ("user_id" uuid NOT NULL, "role_id" uuid NOT NULL, CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY ("user_id", "role_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_109638590074998bb72a2f2cf08" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_suppliers" ADD CONSTRAINT "FK_c1b61c92463463f577fac49b95c" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_suppliers" ADD CONSTRAINT "FK_be4a36f37c7345ab274ec4656d2" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_order_lines" ADD CONSTRAINT "FK_bea838805b97e16d358a3e11c5e" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_order_lines" ADD CONSTRAINT "FK_94351a987335d4452480d5ddf06" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_orders" ADD CONSTRAINT "FK_1fb56bee917dfd98ada56d626de" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_orders" ADD CONSTRAINT "FK_d06febc93fc604568a79b11474d" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "FK_c70f4952f88b5bd649151f631c8" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "FK_1b7242d654272b67cfffcd9d6ea" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_d16a885aa88447ccfd010e739b0" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_74e4ce03ba3f8bc13de20fc594e" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_levels" ADD CONSTRAINT "FK_46e4cf093a8ad0464e4be42f342" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_levels" ADD CONSTRAINT "FK_646a24750192418e87556abd277" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_2c1bb05b80ddcc562cd28d826c6" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_e7831147f5a8ee3c42e6eaeee2e" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_b23c65e50a758245a33ee35fda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_e7831147f5a8ee3c42e6eaeee2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_2c1bb05b80ddcc562cd28d826c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_levels" DROP CONSTRAINT "FK_646a24750192418e87556abd277"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_levels" DROP CONSTRAINT "FK_46e4cf093a8ad0464e4be42f342"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_74e4ce03ba3f8bc13de20fc594e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_d16a885aa88447ccfd010e739b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_lines" DROP CONSTRAINT "FK_1b7242d654272b67cfffcd9d6ea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_order_lines" DROP CONSTRAINT "FK_c70f4952f88b5bd649151f631c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_orders" DROP CONSTRAINT "FK_d06febc93fc604568a79b11474d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_orders" DROP CONSTRAINT "FK_1fb56bee917dfd98ada56d626de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_order_lines" DROP CONSTRAINT "FK_94351a987335d4452480d5ddf06"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales_order_lines" DROP CONSTRAINT "FK_bea838805b97e16d358a3e11c5e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_suppliers" DROP CONSTRAINT "FK_be4a36f37c7345ab274ec4656d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_suppliers" DROP CONSTRAINT "FK_c1b61c92463463f577fac49b95c"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_109638590074998bb72a2f2cf08"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b23c65e50a758245a33ee35fda"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_87b8888186ca9769c960e92687"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_17022daf3f885f7d35423e9971"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_178199805b901ccd220ab7740e"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_tenant_created"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_entity"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6f18d459490bb48923b1f40bdb"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."idx_stock_movements_product_wh"`);
    await queryRunner.query(`DROP INDEX "public"."idx_stock_movements_reference"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_30dd9acc22dcb6ae51d7d34f16"`);
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(`DROP TYPE "public"."stock_movements_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_703e27532235de1937132c8ab4"`);
    await queryRunner.query(`DROP TABLE "stock_levels"`);
    await queryRunner.query(`DROP INDEX "public"."idx_purchase_orders_tenant_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_237678c98436e0abb48b3060c8"`);
    await queryRunner.query(`DROP TABLE "purchase_orders"`);
    await queryRunner.query(`DROP TYPE "public"."purchase_orders_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c07c8a298555beb9a5064d53da"`);
    await queryRunner.query(`DROP TABLE "purchase_order_lines"`);
    await queryRunner.query(`DROP INDEX "public"."idx_sales_orders_tenant_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_sales_orders_placed_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_77e3868b735c09c41f48951170"`);
    await queryRunner.query(`DROP TABLE "sales_orders"`);
    await queryRunner.query(`DROP TYPE "public"."sales_orders_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fe460d031e961e9e3801ed0ed9"`);
    await queryRunner.query(`DROP TABLE "sales_order_lines"`);
    await queryRunner.query(`DROP INDEX "public"."idx_products_tenant_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9c365ebf78f0e8a6d9e4827ea7"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TYPE "public"."products_unit_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_574f802b0db02d671aa366aa04"`);
    await queryRunner.query(`DROP TABLE "product_suppliers"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_97913f35ac2e435a4463fb50a0"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b0d0350059126fa08fddc3c7a4"`);
    await queryRunner.query(`DROP TABLE "suppliers"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_09106b8068aeaf74fa33666df8"`);
    await queryRunner.query(`DROP TABLE "warehouses"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_tenant_email"`);
    await queryRunner.query(`DROP INDEX "public"."uq_users_email"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_109638590074998bb72a2f2cf0"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2310ecc5cb8be427097154b18f"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP TYPE "public"."tenants_plan_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a87cf0659c3ac379b339acf36a"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TYPE "public"."roles_key_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_017943867ed5ceef9c03edd974"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP INDEX "public"."idx_idempotency_keys_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c22d37ec13b71da74d7b4372c3"`);
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
  }
}
