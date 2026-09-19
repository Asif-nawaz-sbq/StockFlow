import { Column, CreateDateColumn, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * Base for every tenant-owned table.
 *
 * Deliberately holds the tenant_id column but no @ManyToOne back to Tenant:
 * importing the Tenant entity here would put a cycle through every entity in
 * the app (base -> tenant -> user -> role -> permission -> base) and leave
 * BaseEntity undefined at class-extension time. The FK is declared in the
 * migration; entities that genuinely need to traverse to the tenant declare
 * the relation themselves.
 *
 * Scoping is enforced in the services via the JWT tenant claim rather than
 * Postgres RLS: we connect with a single app-level role, so RLS would need a
 * SET LOCAL per request plus a second DB role. Worth revisiting only if
 * tenants ever get direct SQL access.
 */
export abstract class TenantOwnedEntity extends BaseEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;
}
