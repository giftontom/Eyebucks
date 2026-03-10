import { extractEdgeFnError } from '../../utils/edgeFunctionError';
import { supabase } from '../supabase';

export interface Coupon {
  id: string;
  code: string;
  discount_pct: number;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const couponsApi = {
  /**
   * Atomically apply a coupon via Edge Function.
   * Records usage and increments use_count — prevents double redemption.
   * Returns couponUseId (pass to createOrder) and discountPct.
   */
  async applyCoupon(code: string, courseId: string): Promise<{ couponUseId: string; discountPct: number }> {
    const { data, error } = await supabase.functions.invoke('coupon-apply', {
      body: { code, courseId },
    });

    if (error) { throw new Error(await extractEdgeFnError(error, 'Failed to apply coupon')); }
    if (!data?.success) { throw new Error(data?.error || 'Invalid or expired coupon code'); }
    return { couponUseId: data.couponUseId, discountPct: data.discountPct };
  },

  async adminListCoupons(): Promise<Coupon[]> {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { throw error; }
    return (data || []) as Coupon[];
  },

  async adminCreateCoupon(coupon: {
    code: string;
    discount_pct: number;
    max_uses?: number;
    expires_at?: string;
  }): Promise<Coupon> {
    const { data, error } = await supabase
      .from('coupons')
      .insert({ ...coupon, code: coupon.code.toUpperCase().trim() })
      .select()
      .single();

    if (error) { throw error; }
    return data as Coupon;
  },

  async adminDeactivateCoupon(id: string): Promise<void> {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: false })
      .eq('id', id);

    if (error) { throw error; }
  },
};
