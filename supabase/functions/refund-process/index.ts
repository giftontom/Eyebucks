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
      return errorResponse('Payment already refunded', corsHeaders, 409);
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
      const rzpError = await rzpResponse.json().catch(() => ({}));
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
