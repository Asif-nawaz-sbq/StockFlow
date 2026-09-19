import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { SalesOrder } from './sales-order.entity';

@Entity('sales_order_lines')
@Unique('uq_sales_order_lines_order_product', ['orderId', 'productId'])
@Check('ck_sales_order_lines_qty_positive', '"qty" > 0')
@Check('ck_sales_order_lines_allocated_within_qty', '"allocated_qty" <= "qty"')
export class SalesOrderLine extends TenantOwnedEntity {
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => SalesOrder, (order) => order.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: SalesOrder;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'int' })
  qty: number;

  /** How much of qty is currently held in stock_levels.reserved. */
  @Column({ name: 'allocated_qty', type: 'int', default: 0 })
  allocatedQty: number;

  /**
   * Copied from the product at line creation, not joined at read time -
   * a later price change must not rewrite the history of an existing order.
   */
  @Column({ name: 'unit_price_cents', type: 'int' })
  unitPriceCents: number;

  @Column({
    name: 'discount_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: '0.00',
  })
  discountPercent: string;

  @Column({ name: 'vat_rate', type: 'numeric', precision: 5, scale: 2 })
  vatRate: string;

  @Column({ name: 'net_cents', type: 'int' })
  netCents: number;

  @Column({ name: 'vat_cents', type: 'int' })
  vatCents: number;

  @Column({ name: 'gross_cents', type: 'int' })
  grossCents: number;
}
