import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));

import { couponsApi } from '../../../services/api/coupons.api';

describe('couponsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('applyCoupon', () => {
    it('should return couponUseId and discountPct on success', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, couponUseId: 'cu-1', discountPct: 20 },
        error: null,
      });

      const result = await couponsApi.applyCoupon('SAVE20', 'c1');
      expect(result.couponUseId).toBe('cu-1');
      expect(result.discountPct).toBe(20);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('coupon-apply', {
        body: { code: 'SAVE20', courseId: 'c1' },
      });
    });

    it('should throw when coupon is invalid', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: false, error: 'Coupon expired' },
        error: null,
      });

      await expect(couponsApi.applyCoupon('EXPIRED', 'c1')).rejects.toThrow('Coupon expired');
    });

    it('should throw on Edge Function error', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Edge function error', context: new Response('{"error":"Network error"}', { status: 400 }) },
      });

      await expect(couponsApi.applyCoupon('BAD', 'c1')).rejects.toThrow();
    });
  });

  describe('adminListCoupons', () => {
    it('should return list of coupons', async () => {
      const mockCoupons = [
        { id: 'co1', code: 'SAVE20', discount_pct: 20, max_uses: 100, use_count: 5, expires_at: null, is_active: true, created_at: '2024-01-01' },
      ];
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockCoupons, error: null }),
        }),
      });

      const result = await couponsApi.adminListCoupons();
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('SAVE20');
    });
  });

  describe('adminCreateCoupon', () => {
    it('should create coupon with uppercased trimmed code', async () => {
      const newCoupon = { id: 'co2', code: 'NEWYEAR', discount_pct: 15, max_uses: null, use_count: 0, expires_at: null, is_active: true, created_at: '2024-01-01' };
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newCoupon, error: null }),
          }),
        }),
      });

      const result = await couponsApi.adminCreateCoupon({ code: ' newyear ', discount_pct: 15 });
      expect(result.code).toBe('NEWYEAR');
    });
  });

  describe('adminDeactivateCoupon', () => {
    it('should set is_active to false', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      await expect(couponsApi.adminDeactivateCoupon('co1')).resolves.toBeUndefined();
      expect(eqMock).toHaveBeenCalledWith('id', 'co1');
    });

    it('should throw on error', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      });

      await expect(couponsApi.adminDeactivateCoupon('co1')).rejects.toThrow();
    });
  });

  describe('applyCoupon null data fallback', () => {
    it('should throw default message when data has no error field', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: false },
        error: null,
      });

      await expect(couponsApi.applyCoupon('BAD', 'c1')).rejects.toThrow('Invalid or expired coupon code');
    });
  });

  describe('adminListCoupons', () => {
    it('should return empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const result = await couponsApi.adminListCoupons();
      expect(result).toEqual([]);
    });
  });
});
