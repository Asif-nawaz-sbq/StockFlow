import { applyDiscount, calculateLineTotals, roundHalfUp, sumOrderTotals } from './money';

describe('roundHalfUp', () => {
  it('rounds .5 away from zero rather than to even', () => {
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(-1.5)).toBe(-2);
  });
});

describe('calculateLineTotals', () => {
  it('applies 19% VAT to a whole-euro line', () => {
    expect(calculateLineTotals(10_00, 3, '19.00')).toEqual({
      netCents: 30_00,
      vatCents: 5_70,
      grossCents: 35_70,
    });
  });

  it('applies the reduced 7% band', () => {
    expect(calculateLineTotals(2_49, 12, '7.00')).toEqual({
      netCents: 29_88,
      vatCents: 2_09,
      grossCents: 31_97,
    });
  });

  it('computes VAT on the line net, not per unit', () => {
    // 3 x 3.33 = 9.99 net -> 1.8981 VAT -> 1.90. Per-unit rounding would give 1.89.
    const line = calculateLineTotals(3_33, 3, '19.00');
    expect(line.netCents).toBe(9_99);
    expect(line.vatCents).toBe(1_90);
  });

  it('discounts before taxing', () => {
    expect(calculateLineTotals(100_00, 2, '19.00', '10.00')).toEqual({
      netCents: 180_00,
      vatCents: 34_20,
      grossCents: 214_20,
    });
  });

  it('handles the zero-rate band', () => {
    expect(calculateLineTotals(5_00, 4, '0.00')).toEqual({
      netCents: 20_00,
      vatCents: 0,
      grossCents: 20_00,
    });
  });

  it('rejects a non-integer quantity', () => {
    expect(() => calculateLineTotals(1_00, 1.5, '19.00')).toThrow(RangeError);
  });

  it('rejects a negative unit price', () => {
    expect(() => calculateLineTotals(-1, 1, '19.00')).toThrow(RangeError);
  });
});

describe('applyDiscount', () => {
  it('is a no-op at zero percent', () => {
    expect(applyDiscount(1234, 0)).toBe(1234);
  });

  it('zeroes the line at 100 percent or more', () => {
    expect(applyDiscount(1234, 100)).toBe(0);
    expect(applyDiscount(1234, 150)).toBe(0);
  });
});

describe('sumOrderTotals', () => {
  it('sums pre-rounded lines without re-deriving VAT', () => {
    const lines = [calculateLineTotals(3_33, 3, '19.00'), calculateLineTotals(2_49, 12, '7.00')];
    // Mixed VAT bands: deriving VAT from the 39.87 subtotal would be wrong.
    expect(sumOrderTotals(lines)).toEqual({
      subtotalCents: 39_87,
      vatTotalCents: 3_99,
      grandTotalCents: 43_86,
    });
  });

  it('returns zeroes for an empty order', () => {
    expect(sumOrderTotals([])).toEqual({
      subtotalCents: 0,
      vatTotalCents: 0,
      grandTotalCents: 0,
    });
  });
});
