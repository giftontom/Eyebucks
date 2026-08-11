// Eyebuckz LMS: Refund - Process via Razorpay API
// Replaces: direct DB-only refund status update

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth, verifyAdmin } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated admin user
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) {return auth.errorResponse;}
    const { user } = auth;

    const supabaseAdmin = createAdminClient();

    const isAdmin = await verifyAdmin(user.id, supabaseAdmin);
    if (!isAdmin) {
      return errorResponse('Admin access required', corsHeaders, 403);
    }

    const { paymentId, reason } = await req.json();

    if (!paymentId || !reason) {
      return errorResponse('paymentId and reason are required', corsHeaders, 400);
    }

    // Fetch payment record
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return errorResponse('Payment not found', corsHeaders, 404);
    }

    if (payment.status === 'refunded') {
      // Idempotent: return existing refund info instead of re-processing
      return jsonResponse({
        success: true,
        alreadyRefunded: true,
        refundId: payment.refund_id,
        amount: payment.refund_amount,
        status: 'refunded',
      }, corsHeaders);
    }

    if (payment.status !== 'captured') {
      return errorResponse('Only captured payments can be refunded', corsHeaders, 400);
    }

    if (!payment.razorpay_payment_id) {
      return errorResponse('No Razorpay payment ID — cannot process refund', corsHeaders, 400);
    }

    // Call Razorpay Refund API
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpaySecret) {
      console.error('[Refund] Razorpay credentials not configured');
      return errorResponse('Razorpay credentials not configured', corsHeaders, 500);
    }

    const rzpResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}/refund`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpaySecret}`),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: payment.amount, // Full refund in paise
          notes: {
            reason,
            refunded_by: user.id,
          },
        }),
      }
    );

    if (!rzpResponse.ok) {
      const rzpError = await rzpResponse.json().catch((e) => { console.error('[Refund] Failed to parse Razorpay error response:', e); return {}; });
      console.error('[Refund] Razorpay API error:', rzpError);
      return errorResponse(
        rzpError?.error?.description || 'Razorpay refund failed',
        corsHeaders,
        502
      );
    }

    const rzpRefund = await rzpResponse.json();

    // Update payment record with refund details
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'refunded',
        refund_id: rzpRefund.id,
        refund_amount: rzpRefund.amount,
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('[Refund] DB update error:', updateError);
      // Razorpay refund succeeded but DB update failed — log for manual reconciliation
      return errorResponse(
        'Refund processed at Razorpay but DB update failed. Razorpay refund ID: ' + rzpRefund.id,
        corsHeaders,
        500
      );
    }

    // Revoke enrollment
    if (payment.enrollment_id) {
      await supabaseAdmin
        .from('enrollments')
        .update({ status: 'REVOKED' })
        .eq('id', payment.enrollment_id);
    }

    // Revoke any active certificates for this user+course
    const { error: certError } = await supabaseAdmin
      .from('certificates')
      .update({
        status: 'REVOKED',
        revoked_at: new Date().toISOString(),
        revoked_reason: `Refund processed: ${reason}`,
      })
      .eq('user_id', payment.user_id)
      .eq('course_id', payment.course_id)
      .eq('status', 'ACTIVE');

    if (certError) {
      console.error('[Refund] Certificate revocation error (non-fatal):', certError);
    }

    // Revoke ALL access granted under this payment's Razorpay order. This covers
    // bundle member enrollments and bundled/direct asset purchases, which the
    // enrollment_id-only revoke above (a single row) misses. Members were granted
    // with order_id = this order, so revoke by order_id + user.
    if (payment.razorpay_order_id) {
      const { data: revokedEnrollments, error: enrRevokeError } = await supabaseAdmin
        .from('enrollments')
        .update({ status: 'REVOKED' })
        .eq('order_id', payment.razorpay_order_id)
        .eq('user_id', payment.user_id)
        .select('course_id');
      if (enrRevokeError) {
        console.error('[Refund] Order enrollment revocation error (non-fatal):', enrRevokeError);
      }

      // KNOWN LIMITATION: asset_purchases is UNIQUE(user_id, asset_id) — a single
      // row per asset carrying the FIRST purchase's order_id. If a user owns an
      // asset both directly (order A) AND via a later bundle (order B, ignored on
      // upsert), refunding order A revokes the only row even though the bundle
      // entitlement B survives. Narrow (same asset bought twice) + pre-launch;
      // proper fix is a per-order grant ledger. Admin can re-grant manually.
      const { error: assetRevokeError } = await supabaseAdmin
        .from('asset_purchases')
        .update({ status: 'REVOKED' })
        .eq('order_id', payment.razorpay_order_id)
        .eq('user_id', payment.user_id);
      if (assetRevokeError) {
        console.error('[Refund] Order asset revocation error (non-fatal):', assetRevokeError);
      }

      // Revoke active certificates for any bundle member course just revoked.
      const memberCourseIds = (revokedEnrollments || [])
        .map(e => e.course_id)
        .filter((id): id is string => !!id && id !== payment.course_id);
      if (memberCourseIds.length > 0) {
        const { error: memberCertError } = await supabaseAdmin
          .from('certificates')
          .update({
            status: 'REVOKED',
            revoked_at: new Date().toISOString(),
            revoked_reason: `Refund processed: ${reason}`,
          })
          .eq('user_id', payment.user_id)
          .in('course_id', memberCourseIds)
          .eq('status', 'ACTIVE');
        if (memberCertError) {
          console.error('[Refund] Member certificate revocation error (non-fatal):', memberCertError);
        }
      }
    }

    // Notify user
    await supabaseAdmin.from('notifications').insert({
      user_id: payment.user_id,
      type: 'announcement',
      title: 'Refund Processed',
      message: `Your refund of ${(rzpRefund.amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} has been initiated. It may take 5-7 business days to reflect.`,
      link: '/dashboard',
    });

    return jsonResponse({
      success: true,
      refundId: rzpRefund.id,
      amount: rzpRefund.amount,
      status: rzpRefund.status,
    }, corsHeaders);
  } catch (error) {
    console.error('[Refund Process] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
