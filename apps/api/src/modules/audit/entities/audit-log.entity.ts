import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';

/**
 * Written by AuditInterceptor for every non-GET request that succeeds.
 * Append-only; there is no update or delete path in the app.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_tenant_created', ['tenantId', 'createdAt'])
@Index('idx_audit_logs_entity', ['entityType', 'entityId'])
export class AuditLog extends TenantOwnedEntity {
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'varchar', name: 'actor_email', length: 255, nullable: true })
  actorEmail: string | null;

  /** "sales_order.confirm", "product.update", ... */
  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ type: 'varchar', name: 'entity_type', length: 60, nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, unknown> | null;

  @Column({ type: 'varchar', name: 'request_id', length: 64, nullable: true })
  requestId: string | null;

  @Column({ type: 'varchar', name: 'ip_address', length: 64, nullable: true })
  ipAddress: string | null;
}
