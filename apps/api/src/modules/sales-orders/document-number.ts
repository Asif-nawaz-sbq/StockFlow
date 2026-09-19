import { EntityManager } from 'typeorm';

/**
 * Generates the next per-tenant document number, e.g. SO-2026-00042.
 *
 * A plain Postgres sequence would be simpler but numbering has to restart per
 * tenant and per year, and gaps look like lost paperwork to an accountant.
 * The transaction-scoped advisory lock serialises concurrent creates for one
 * tenant only; it is released automatically on commit or rollback.
 */
export async function nextDocumentNumber(
  em: EntityManager,
  tenantId: string,
  table: 'sales_orders' | 'purchase_orders',
  column: 'order_number' | 'po_number',
  prefix: 'SO' | 'PO',
): Promise<string> {
  const year = new Date().getUTCFullYear();
  const pattern = `${prefix}-${year}-%`;

  await em.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${table}:${tenantId}:${year}`]);

  const rows: Array<{ max: string | null }> = await em.query(
    `SELECT MAX(SUBSTRING(${column} FROM '[0-9]+$')::int)::text AS max
       FROM ${table}
      WHERE tenant_id = $1 AND ${column} LIKE $2`,
    [tenantId, pattern],
  );

  const next = Number(rows[0]?.max ?? 0) + 1;
  return `${prefix}-${year}-${String(next).padStart(5, '0')}`;
}
