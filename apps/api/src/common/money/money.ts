/**
 * All money is integer cents. The only place fractions appear is VAT and
 * discount percentages, which are applied here and rounded once per line.
 *
 * Rounding is half-up, matching what German invoicing software does. Banker's
 * rounding would drift against what a customer sees on a paper invoice.
 */

export function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function applyDiscount(grossCents: number, discountPercent: string | number): number {
  const pct = typeof discountPercent === 'string' ? Number(discountPercent) : discountPercent;
  if (!Number.isFinite(pct) || pct <= 0) return grossCents;
  if (pct >= 100) return 0;
  return roundHalfUp(grossCents * (1 - pct / 100));
}

export interface LineTotals {
  netCents: number;
  vatCents: number;
  grossCents: number;
}

/**
 * Prices are held net (excluding VAT), which is the norm for B2B in DE.
 * VAT is computed on the discounted line net, not per unit, so a 3 x 3.33 EUR
 * line doesn't accumulate a cent of rounding error per unit.
 */
export function calculateLineTotals(
  unitPriceCents: number,
  qty: number,
  vatRate: string | number,
  discountPercent: string | number = 0,
): LineTotals {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new RangeError(`qty must be a positive integer, got ${qty}`);
  }
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new RangeError(`unitPriceCents must be a non-negative integer, got ${unitPriceCents}`);
  }

  const rate = typeof vatRate === 'string' ? Number(vatRate) : vatRate;
  if (!Number.isFinite(rate) || rate < 0) {
    throw new RangeError(`vatRate must be a non-negative number, got ${vatRate}`);
  }

  const netCents = applyDiscount(unitPriceCents * qty, discountPercent);
  const vatCents = roundHalfUp(netCents * (rate / 100));

  return { netCents, vatCents, grossCents: netCents + vatCents };
}

export interface OrderTotals {
  subtotalCents: number;
  vatTotalCents: number;
  grandTotalCents: number;
}

/** Sums pre-rounded line totals. Never re-derives VAT from the order subtotal. */
export function sumOrderTotals(lines: LineTotals[]): OrderTotals {
  const subtotalCents = lines.reduce((sum, line) => sum + line.netCents, 0);
  const vatTotalCents = lines.reduce((sum, line) => sum + line.vatCents, 0);
  return {
    subtotalCents,
    vatTotalCents,
    grandTotalCents: subtotalCents + vatTotalCents,
  };
}

export function formatEur(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}
