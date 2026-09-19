import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/users/entities/user.entity';

export enum TenantPlan {
  TRIAL = 'trial',
  STANDARD = 'standard',
  ENTERPRISE = 'enterprise',
}

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  slug: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', name: 'vat_id', length: 32, nullable: true })
  vatId: string | null;

  @Column({ type: 'varchar', length: 2, default: 'DE' })
  country: string;

  @Column({ type: 'enum', enum: TenantPlan, default: TenantPlan.TRIAL })
  plan: TenantPlan;

  @Column({ type: 'varchar', name: 'default_currency', length: 3, default: 'EUR' })
  defaultCurrency: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];
}
