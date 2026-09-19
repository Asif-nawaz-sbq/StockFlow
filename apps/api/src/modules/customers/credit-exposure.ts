import { EntityManager } from 'typeorm';

/**
 * What a customer currently owes us.
 *
 * Counts orders that are committed but not yet paid for:
 *   - confirmed and picked orders in full, because the stock is promised and
 *     the invoice is coming;
 *   - shipped orders only while they are still inside the customer's payment
 *     terms window.
 *
 * We do not model payments, so the payment-terms window stands in for "the
 * invoice has probably been settled by now". Without it, exposure would only
 * ever grow and every long-standing customer would eventually be frozen out -
 * which is exactly what the seeded history produced on the first run.
 *
 * A real deployment would replace the time window with the open items from
 * accounts receivable.
 */
export async function creditExposureCents(
  em: EntityManager,
  tenantId: string,
  customerId: string,
  paymentTermsDays: number,
  excludeOrderId?: string,
): Promise<number> {
  const rows: Array<{ sum: string }> = await em.query(
    `SELECT COALESCE(SUM(o.grand_total_cents), 0)::text AS sum
       FROM sales_orders o
      WHERE o.tenant_id = $1
        AND o.customer_id = $2
        AND ($4::uuid IS NULL OR o.id <> $4::uuid)
        AND (
              o.status IN ('confirmed', 'picked')
           OR (o.status = 'shipped'
               AND o.shipped_at > now() - make_interval(days => $3))
        )`,
    [tenantId, customerId, paymentTermsDays, excludeOrderId ?? null],
  );

  return Number(rows[0]?.sum ?? 0);
}
