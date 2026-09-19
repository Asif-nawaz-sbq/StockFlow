import { Column, Entity, Index, OneToMany, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';
import { ProductSupplier } from './product-supplier.entity';

export enum ProductUnit {
  PIECE = 'piece',
  BOX = 'box',
  PALLET = 'pallet',
  KILOGRAM = 'kg',
  LITRE = 'l',
}

/** German VAT bands. Stored on the product so historic orders keep their rate. */
export enum VatRate {
  STANDARD = '19.00',
  REDUCED = '7.00',
  ZERO = '0.00',
}

@Entity('products')
@Unique('uq_products_tenant_sku', ['tenantId', 'sku'])
@Index('idx_products_tenant_active', ['tenantId', 'isActive'])
export class Product extends TenantOwnedEntity {
  @Column({ type: 'varchar', length: 40 })
  sku: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 80 })
  category: string;

  @Column({ type: 'varchar', length: 14, nullable: true })
  ean: string | null;

  @Column({ type: 'enum', enum: ProductUnit, default: ProductUnit.PIECE })
  unit: ProductUnit;

  /** Minor units (cents). Never store money as float. */
  @Column({ name: 'sell_price_cents', type: 'int' })
  sellPriceCents: number;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({
    name: 'vat_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: '19.00',
  })
  vatRate: string;

  /** Available stock below this triggers a replenishment suggestion. */
  @Column({ name: 'reorder_point', type: 'int', default: 0 })
  reorderPoint: number;

  @Column({ name: 'reorder_quantity', type: 'int', default: 0 })
  reorderQuantity: number;

  @Column({ name: 'weight_grams', type: 'int', nullable: true })
  weightGrams: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => ProductSupplier, (ps) => ps.product)
  supplierLinks: ProductSupplier[];
}
