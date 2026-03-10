// Eyebuckz LMS: Coupon Apply
// Atomically validates a coupon, records the use, and increments use_count.
// Returns couponUseId + discountPct for use in checkout-create-order.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) { return auth.errorResponse; }
    const { user } = auth;

    const { code, courseId } = await req.json();
    if (!code || !courseId) {
      return errorResponse('code and courseId are required', corsHeaders, 400);
    }

    const supabaseAdmin = createAdminClient();

    // Call atomic apply_coupon function
    const { data, error } = await supabaseAdmin.rpc('apply_coupon', {
      p_code: code,
      p_user_id: user.id,
      p_course_id: courseId,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('COUPON_NOT_FOUND')) {
        return errorResponse('Coupon not found', corsHeaders, 404);
      }
      if (msg.includes('COUPON_INACTIVE')) {
        return errorResponse('Coupon is no longer active', corsHeaders, 400);
      }
      if (msg.includes('COUPON_EXPIRED')) {
        return errorResponse('Coupon has expired', corsHeaders, 400);
      }
      if (msg.includes('COUPON_LIMIT_REACHED')) {
        return errorResponse('Coupon usage limit reached', corsHeaders, 400);
      }
      if (msg.includes('COUPON_ALREADY_USED')) {
        return errorResponse('You have already used this coupon for this course', corsHeaders, 409);
      }
      console.error('[CouponApply] RPC error:', error);
      return errorResponse('Failed to apply coupon', corsHeaders, 500);
    }

    if (!data || data.length === 0) {
      return errorResponse('Coupon apply returned no result', corsHeaders, 500);
    }

    const { coupon_use_id: couponUseId, discount_pct: discountPct } = data[0];

    return jsonResponse({ success: true, couponUseId, discountPct }, corsHeaders);
  } catch (error) {
    console.error('[CouponApply] Error:', error);
    return errorResponse('Internal server error', getCorsHeaders(req), 500);
  }
});
