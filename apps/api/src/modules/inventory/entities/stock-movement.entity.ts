import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';

export enum MovementType {
  /** Goods received against a purchase order. */
  RECEIPT = 'receipt',
  /** Goods shipped against a sales order. */
  ISSUE = 'issue',
  /** Manual correction after a stock count. */
  ADJUSTMENT = 'adjustment',
  /** Customer return back into sellable stock. */
  RETURN = 'return',
  TRANSFER_OUT = 'transfer_out',
  TRANSFER_IN = 'transfer_in',
  /** Written off - damaged, expired, lost. */
  SCRAP = 'scrap',
}

/**
 * Append-only inventory ledger. This is the source of truth for on-hand stock;
 * stock_levels is a running total that can always be rebuilt from here.
 * Nothing in the app updates or deletes rows in this table.
 */
@Entity('stock_movements')
@Index('idx_stock_movements_product_wh', ['productId', 'warehouseId', 'occurredAt'])
@Index('idx_stock_movements_reference', ['referenceType', 'referenceId'])
export class StockMovement extends TenantOwnedEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  /** Signed. Positive adds to on-hand, negative removes. Never zero. */
  @Column({ name: 'qty_delta', type: 'int' })
  qtyDelta: number;

  /** On-hand after this movement, for point-in-time audit without replaying the ledger. */
  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter: number;

  /** Unit cost at the time of a receipt; null for issues and adjustments. */
  @Column({ name: 'unit_cost_cents', type: 'int', nullable: true })
  unitCostCents: number | null;

  @Column({ type: 'varchar', name: 'reference_type', length: 32, nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;
}
