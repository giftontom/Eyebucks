import { describe, it, expect } from 'vitest';

import { formatINR, formatPrice } from '../../../utils/format';

/**
 * Regression guard for the U4 currency-consistency fix.
 *
 * House rule:
 *  - `formatPrice` → catalog / marketing (whole rupees, never paise)
 *  - `formatINR`   → exact amounts on receipts / payments (decimals only when non-zero)
 */
describe('formatINR — exact amounts (receipts, payments, revenue)', () => {
  it('shows no decimals for whole-rupee amounts', () => {
    expect(formatINR(99900)).toBe('₹999');
    expect(formatINR(1499900)).toBe('₹14,999');
  });

  it('shows decimals only when the amount actually carries paise', () => {
    expect(formatINR(14999)).toBe('₹149.99');
    expect(formatINR(3499)).toBe('₹34.99');
  });

  it('treats zero and nullish input as ₹0', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(undefined as unknown as number)).toBe('₹0');
  });
});

describe('formatPrice — catalog display (whole rupees)', () => {
  it('drops paise so a listing never mixes ₹999 with ₹149.99', () => {
    expect(formatPrice(99900)).toBe('₹999');
    expect(formatPrice(149900)).toBe('₹1,499');
  });

  it('rounds odd paise values to whole rupees', () => {
    expect(formatPrice(14999)).toBe('₹150'); // 149.99 → 150
    expect(formatPrice(3499)).toBe('₹35');   // 34.99 → 35
  });

  it('uses Indian digit grouping where the runtime supports en-IN', () => {
    const supportsIndianGrouping = (150000).toLocaleString('en-IN') === '1,50,000';
    if (supportsIndianGrouping) {
      expect(formatPrice(15000000)).toBe('₹1,50,000');
    } else {
      expect(formatPrice(15000000)).toContain(',');
    }
  });
});
