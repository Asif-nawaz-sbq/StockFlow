import { Column, Entity, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';

@Entity('suppliers')
@Unique('uq_suppliers_tenant_code', ['tenantId', 'code'])
export class Supplier extends TenantOwnedEntity {
  @Column({ type: 'varchar', length: 16 })
  code: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', name: 'contact_name', length: 120, nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', name: 'contact_email', length: 255, nullable: true })
  contactEmail: string | null;

  @Column({ type: 'varchar', name: 'contact_phone', length: 40, nullable: true })
  contactPhone: string | null;

  @Column({ type: 'varchar', length: 2, default: 'DE' })
  country: string;

  @Column({ type: 'varchar', name: 'vat_id', length: 32, nullable: true })
  vatId: string | null;

  /** Working days from PO sent to goods expected. Drives reorder suggestions. */
  @Column({ name: 'lead_time_days', type: 'int', default: 7 })
  leadTimeDays: number;

  @Column({ name: 'payment_terms_days', type: 'int', default: 30 })
  paymentTermsDays: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
