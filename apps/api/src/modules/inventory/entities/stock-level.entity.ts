import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';

/**
 * Running totals per (product, warehouse). Derived from stock_movements and
 * rebuildable via InventoryService.rebuildLevels - it exists so the hot read
 * path is a single indexed row instead of a SUM over the whole ledger.
 *
 * Rows are locked FOR UPDATE during allocation, which is what stops two
 * concurrent orders from reserving the same unit.
 */
@Entity('stock_levels')
@Unique('uq_stock_levels_product_wh', ['productId', 'warehouseId'])
@Check('ck_stock_levels_on_hand_non_negative', '"on_hand" >= 0')
@Check('ck_stock_levels_reserved_non_negative', '"reserved" >= 0')
@Check('ck_stock_levels_reserved_within_on_hand', '"reserved" <= "on_hand"')
export class StockLevel extends TenantOwnedEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  /** Physically in the building, including units reserved for confirmed orders. */
  @Column({ name: 'on_hand', type: 'int', default: 0 })
  onHand: number;

  /** Promised to confirmed-but-unshipped sales orders. */
  @Column({ type: 'int', default: 0 })
  reserved: number;

  /** On open purchase orders, not yet received. Used by replenishment only. */
  @Column({ name: 'on_order', type: 'int', default: 0 })
  onOrder: number;

  @Column({ name: 'last_movement_at', type: 'timestamptz', nullable: true })
  lastMovementAt: Date | null;

  get available(): number {
    return this.onHand - this.reserved;
  }
}
