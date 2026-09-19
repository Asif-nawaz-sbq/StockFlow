import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  /** Format: "<resource>:<action>", e.g. "sales_orders:confirm". */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 160 })
  description: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
