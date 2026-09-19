import { Column, Entity, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';

@Entity('customers')
@Unique('uq_customers_tenant_code', ['tenantId', 'code'])
export class Customer extends TenantOwnedEntity {
  @Column({ type: 'varchar', length: 16 })
  code: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', name: 'contact_name', length: 120, nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', name: 'vat_id', length: 32, nullable: true })
  vatId: string | null;

  @Column({ type: 'varchar', name: 'billing_address_line1', length: 160 })
  billingAddressLine1: string;

  @Column({ type: 'varchar', name: 'billing_postal_code', length: 16 })
  billingPostalCode: string;

  @Column({ type: 'varchar', name: 'billing_city', length: 80 })
  billingCity: string;

  @Column({ type: 'varchar', name: 'billing_country', length: 2, default: 'DE' })
  billingCountry: string;

  /** Zero means no limit. Checked on order confirm against unpaid order value. */
  @Column({ name: 'credit_limit_cents', type: 'int', default: 0 })
  creditLimitCents: number;

  @Column({ name: 'payment_terms_days', type: 'int', default: 14 })
  paymentTermsDays: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
