import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Permission } from './permission.entity';
import { User } from 'src/modules/users/entities/user.entity';

export enum RoleKey {
  OWNER = 'owner',
  OPS_MANAGER = 'ops_manager',
  WAREHOUSE_CLERK = 'warehouse_clerk',
  VIEWER = 'viewer',
}

/** Roles are system-defined and shared across tenants; only assignments are per-user. */
@Entity('roles')
export class Role extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'enum', enum: RoleKey })
  key: RoleKey;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: false,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}
