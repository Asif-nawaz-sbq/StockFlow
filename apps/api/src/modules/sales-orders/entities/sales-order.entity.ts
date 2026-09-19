import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { Warehouse } from 'src/modules/warehouses/entities/warehouse.entity';
import { SalesOrderLine } from './sales-order-line.entity';

export enum SalesOrderStatus {
  /** Editable. No stock committed. */
  DRAFT = 'draft',
  /** Stock reserved against stock_levels.reserved. Lines are frozen. */
  CONFIRMED = 'confirmed',
  /** Warehouse has physically picked the goods. */
  PICKED = 'picked',
  /** Reservation converted into an issue movement. Terminal. */
  SHIPPED = 'shipped',
  /** Reservation released. Terminal. */
  CANCELLED = 'cancelled',
}

/** Transitions the service will accept; anything else is a 409. */
export const SALES_ORDER_TRANSITIONS: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  [SalesOrderStatus.DRAFT]: [SalesOrderStatus.CONFIRMED, SalesOrderStatus.CANCELLED],
  [SalesOrderStatus.CONFIRMED]: [SalesOrderStatus.PICKED, SalesOrderStatus.CANCELLED],
  [SalesOrderStatus.PICKED]: [SalesOrderStatus.SHIPPED, SalesOrderStatus.CANCELLED],
  [SalesOrderStatus.SHIPPED]: [],
  [SalesOrderStatus.CANCELLED]: [],
};

@Entity('sales_orders')
@Unique('uq_sales_orders_tenant_number', ['tenantId', 'orderNumber'])
@Index('idx_sales_orders_tenant_status', ['tenantId', 'status'])
@Index('idx_sales_orders_placed_at', ['tenantId', 'placedAt'])
export class SalesOrder extends TenantOwnedEntity {
  @Column({ type: 'varchar', name: 'order_number', length: 24 })
  orderNumber: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  /** Single-warehouse fulfilment. Split shipments would need this on the line. */
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({
    type: 'enum',
    enum: SalesOrderStatus,
    default: SalesOrderStatus.DRAFT,
  })
  status: SalesOrderStatus;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ name: 'subtotal_cents', type: 'int', default: 0 })
  subtotalCents: number;

  @Column({ name: 'vat_total_cents', type: 'int', default: 0 })
  vatTotalCents: number;

  @Column({ name: 'grand_total_cents', type: 'int', default: 0 })
  grandTotalCents: number;

  @Column({ name: 'placed_at', type: 'timestamptz' })
  placedAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @OneToMany(() => SalesOrderLine, (line) => line.order, {
    cascade: ['insert'],
  })
  lines: SalesOrderLine[];
}
