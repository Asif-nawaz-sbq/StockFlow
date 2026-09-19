import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('purchase_order_lines')
@Unique('uq_purchase_order_lines_po_product', ['purchaseOrderId', 'productId'])
@Check('ck_po_lines_qty_positive', '"qty_ordered" > 0')
@Check('ck_po_lines_received_within_ordered', '"qty_received" <= "qty_ordered"')
export class PurchaseOrderLine extends TenantOwnedEntity {
  @Column({ name: 'purchase_order_id', type: 'uuid' })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'qty_ordered', type: 'int' })
  qtyOrdered: number;

  @Column({ name: 'qty_received', type: 'int', default: 0 })
  qtyReceived: number;

  @Column({ name: 'unit_cost_cents', type: 'int' })
  unitCostCents: number;
}
