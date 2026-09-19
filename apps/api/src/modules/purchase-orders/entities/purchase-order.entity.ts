import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';
import { Supplier } from 'src/modules/suppliers/entities/supplier.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';
import { PurchaseOrderLine } from './purchase-order-line.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  /** Sent to the supplier. Quantities count towards stock_levels.on_order. */
  SENT = 'sent',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

export const PURCHASE_ORDER_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  [PurchaseOrderStatus.DRAFT]: [PurchaseOrderStatus.SENT, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.SENT]: [
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
    PurchaseOrderStatus.RECEIVED,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
    PurchaseOrderStatus.RECEIVED,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.RECEIVED]: [],
  [PurchaseOrderStatus.CANCELLED]: [],
};

@Entity('purchase_orders')
@Unique('uq_purchase_orders_tenant_number', ['tenantId', 'poNumber'])
@Index('idx_purchase_orders_tenant_status', ['tenantId', 'status'])
export class PurchaseOrder extends TenantOwnedEntity {
  @Column({ type: 'varchar', name: 'po_number', length: 24 })
  poNumber: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string;

  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT,
  })
  status: PurchaseOrderStatus;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ name: 'subtotal_cents', type: 'int', default: 0 })
  subtotalCents: number;

  @Column({ name: 'expected_at', type: 'date', nullable: true })
  expectedAt: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @OneToMany(() => PurchaseOrderLine, (line) => line.purchaseOrder, {
    cascade: ['insert'],
  })
  lines: PurchaseOrderLine[];
}
