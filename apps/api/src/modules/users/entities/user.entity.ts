import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';
import { Role } from 'src/modules/rbac/entities/role.entity';
import { Tenant } from 'src/modules/tenants/entities/tenant.entity';

export enum UserStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Entity('users')
@Index('idx_users_tenant_email', ['tenantId', 'email'])
export class User extends TenantOwnedEntity {
  /**
   * Globally unique, not per-tenant. Login happens before we know the tenant,
   * so an address can only ever belong to one workspace. Multi-workspace
   * membership would need a users <-> tenants join table.
   */
  @Index('uq_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', name: 'full_name', length: 160 })
  fullName: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.INVITED })
  status: UserStatus;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  /** Bumped on password change / forced logout; refresh tokens below this are rejected. */
  @Column({ name: 'token_version', type: 'int', default: 0 })
  tokenVersion: number;

  /** Needed on login to put the workspace name in the session payload. */
  @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
