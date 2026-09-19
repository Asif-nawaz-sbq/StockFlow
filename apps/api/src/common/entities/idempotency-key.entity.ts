import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantOwnedEntity } from 'src/common/entities/base.entity';

/**
 * Backs the Idempotency-Key header on order mutations. Kept in Postgres rather
 * than Redis on purpose: a replayed "confirm" that slipped through an evicted
 * Redis key would double-reserve stock, so this needs the same durability as
 * the write it guards.
 */
@Entity('idempotency_keys')
@Unique('uq_idempotency_keys_tenant_key', ['tenantId', 'key'])
@Index('idx_idempotency_keys_created', ['createdAt'])
export class IdempotencyKey extends TenantOwnedEntity {
  @Column({ type: 'varchar', length: 128 })
  key: string;

  @Column({ type: 'varchar', length: 200 })
  endpoint: string;

  /** SHA-256 of the request body - a same key with a different body is a 422. */
  @Column({ type: 'varchar', name: 'request_hash', length: 64 })
  requestHash: string;

  @Column({ name: 'response_status', type: 'int', nullable: true })
  responseStatus: number | null;

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody: Record<string, unknown> | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
