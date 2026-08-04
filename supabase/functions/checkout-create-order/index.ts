// Eyebuckz LMS: Checkout - Create Razorpay Order
// Product-aware: handles course purchases (default) and digital-asset purchases.
// Replaces: POST /api/checkout/create-order

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) {return auth.errorResponse;}
    const { user } = auth;

    const supabaseAdmin = createAdminClient();

    const body = await req.json();
    const productType = body.productType === 'asset' ? 'asset' : 'course';

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    // ──────────────────────────────────────────────────────────────────────
    // DIGITAL ASSET purchase
    // ──────────────────────────────────────────────────────────────────────
    if (productType === 'asset') {
      const { assetId, couponUseId } = body;
      if (!assetId) {
        return errorResponse('assetId is required', corsHeaders, 400);
      }

      const { data: asset } = await supabaseAdmin
        .from('digital_assets')
        .select('id, title, price, status, deleted_at')
        .eq('id', assetId)
        .maybeSingle();

      if (!asset || asset.status !== 'PUBLISHED' || asset.deleted_at) {
        return errorResponse('Asset not found', corsHeaders, 404);
      }
      if (asset.price <= 0) {
        return errorResponse('This asset is free — no payment required', corsHeaders, 400);
      }

      const { data: existing } = await supabaseAdmin
        .from('asset_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('asset_id', assetId)
        .eq('status', 'ACTIVE')
        .maybeSingle();
      if (existing) {
        return errorResponse('You already own this asset', corsHeaders, 409);
      }

      // Apply a previously-redeemed coupon (must belong to this user + asset).
      let effectivePrice = asset.price;
      if (couponUseId) {
        const { data: couponUse } = await supabaseAdmin
          .from('coupon_uses')
          .select('user_id, asset_id, discount_pct')
          .eq('id', couponUseId)
          .maybeSingle();
        if (!couponUse || couponUse.user_id !== user.id || couponUse.asset_id !== assetId) {
          return errorResponse('Invalid coupon reference', corsHeaders, 400);
        }
        effectivePrice = Math.round(asset.price * (1 - couponUse.discount_pct / 100));
      }

      const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
        },
        body: JSON.stringify({
          amount: effectivePrice,
          currency: 'INR',
          receipt: `asset_${assetId}_${user.id}`.substring(0, 40),
          notes: {
            productType: 'asset',
            assetId,
            userId: user.id,
            assetTitle: asset.title,
          },
        }),
      });

      if (!razorpayResponse.ok) {
        const errorText = await razorpayResponse.text();
        console.error('[Checkout] Razorpay asset order creation failed:', errorText);
        return errorResponse('Failed to create payment order', corsHeaders, 500);
      }

      const order = await razorpayResponse.json();
      return jsonResponse({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: razorpayKeyId,
        title: asset.title,
        courseTitle: asset.title, // legacy field name kept for any shared UI
      }, corsHeaders);
    }

    // ──────────────────────────────────────────────────────────────────────
    // COURSE purchase (default — unchanged behaviour)
    // ──────────────────────────────────────────────────────────────────────
    const { courseId, couponUseId } = body;
    if (!courseId) {
      return errorResponse('courseId is required', corsHeaders, 400);
    }

    // Fetch course
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('status', 'PUBLISHED')
      .single();

    if (courseError || !course) {
      return errorResponse('Course not found', corsHeaders, 404);
    }

    // Reject free courses — no payment required
    if (course.price <= 0) {
      return errorResponse('This course is free — no payment required', corsHeaders, 400);
    }

    // Verify couponUseId belongs to the authed user for this course (if provided)
    let effectivePrice = course.price;
    if (couponUseId) {
      const { data: couponUse } = await supabaseAdmin
        .from('coupon_uses')
        .select('user_id, course_id, discount_pct')
        .eq('id', couponUseId)
        .maybeSingle();

      if (!couponUse || couponUse.user_id !== user.id || couponUse.course_id !== courseId) {
        return errorResponse('Invalid coupon reference', corsHeaders, 400);
      }

      effectivePrice = Math.round(course.price * (1 - couponUse.discount_pct / 100));
    }

    // Check existing enrollment
    const { data: existing } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (existing) {
      return errorResponse('Already enrolled in this course', corsHeaders, 409);
    }

    // Create Razorpay order
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify({
        amount: effectivePrice,
        currency: 'INR',
        receipt: `order_${courseId}_${user.id}`.substring(0, 40),
        notes: {
          productType: 'course',
          courseId,
          userId: user.id,
          courseTitle: course.title,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error('[Checkout] Razorpay order creation failed:', errorText);
      return errorResponse('Failed to create payment order', corsHeaders, 500);
    }

    const order = await razorpayResponse.json();

    return jsonResponse({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: razorpayKeyId,
      courseTitle: course.title,
    }, corsHeaders);
  } catch (error) {
    console.error('[Checkout] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
