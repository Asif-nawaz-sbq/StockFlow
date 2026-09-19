import { Column, Entity, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';

@Entity('warehouses')
@Unique('uq_warehouses_tenant_code', ['tenantId', 'code'])
export class Warehouse extends TenantOwnedEntity {
  @Column({ type: 'varchar', length: 16 })
  code: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', name: 'address_line1', length: 160 })
  addressLine1: string;

  @Column({ type: 'varchar', name: 'postal_code', length: 16 })
  postalCode: string;

  @Column({ type: 'varchar', length: 80 })
  city: string;

  @Column({ type: 'varchar', length: 2, default: 'DE' })
  country: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
