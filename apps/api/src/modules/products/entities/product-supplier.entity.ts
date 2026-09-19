import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';
import { Product } from './product.entity';
import { Supplier } from 'src/modules/suppliers/entities/supplier.entity';

/** What a given supplier charges us for a given product, and on what terms. */
@Entity('product_suppliers')
@Unique('uq_product_suppliers_pair', ['productId', 'supplierId'])
export class ProductSupplier extends TenantOwnedEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.supplierLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'varchar', name: 'supplier_sku', length: 60, nullable: true })
  supplierSku: string | null;

  @Column({ name: 'cost_price_cents', type: 'int' })
  costPriceCents: number;

  /** Minimum order quantity - reorder suggestions round up to a multiple of this. */
  @Column({ name: 'min_order_qty', type: 'int', default: 1 })
  minOrderQty: number;

  @Column({ name: 'is_preferred', default: false })
  isPreferred: boolean;
}
