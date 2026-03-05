// Eyebuckz LMS: Checkout - Razorpay Webhook Handler
// Replaces: POST /api/checkout/webhook
// Note: verify_jwt is disabled for this function (webhooks from Razorpay)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { hmacSha256, timingSafeEqual } from '../_shared/hmac.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();

    // Verify webhook secret is configured (mandatory)
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured');
      return new Response('Webhook verification not configured', { status: 500 });
    }

    // Verify signature header is present (mandatory)
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      console.error('[Webhook] Missing x-razorpay-signature header');
      return new Response('Missing signature', { status: 401 });
    }

    // Verify signature is valid
    const expectedSignature = await hmacSha256(body, webhookSecret);
    const isValid = timingSafeEqual(expectedSignature, signature);
    if (!isValid) {
      console.error('[Webhook] Invalid signature');
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    const supabaseAdmin = createAdminClient();

    console.log('[Webhook] Received event:', eventType);

    if (eventType === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const { courseId, userId } = payment.notes || {};

      if (courseId && userId) {
        // Check if enrollment already exists (idempotency)
        const { data: existing } = await supabaseAdmin
          .from('enrollments')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();

        if (!existing) {
          // Create enrollment
          const { data: newEnrollment } = await supabaseAdmin.from('enrollments').insert({
            user_id: userId,
            course_id: courseId,
            status: 'ACTIVE',
            payment_id: payment.id,
            order_id: payment.order_id,
            amount: payment.amount,
            enrolled_at: new Date().toISOString(),
          }).select('id').single();

          // Insert payment record
          const receiptNumber = `EYB-${Date.now().toString(36).toUpperCase()}`;
          await supabaseAdmin.from('payments').insert({
            user_id: userId,
            course_id: courseId,
            enrollment_id: newEnrollment?.id,
            razorpay_order_id: payment.order_id,
            razorpay_payment_id: payment.id,
            amount: payment.amount,
            currency: payment.currency?.toUpperCase() || 'INR',
            status: 'captured',
            method: payment.method || null,
            receipt_number: receiptNumber,
          }).then(({ error: payError }) => {
            if (payError) {console.error('[Webhook] Payment record error:', payError);}
          });

          // Create notification
          const { data: course } = await supabaseAdmin
            .from('courses')
            .select('title')
            .eq('id', courseId)
            .single();

          if (course) {
            await supabaseAdmin.from('notifications').insert({
              user_id: userId,
              type: 'enrollment',
              title: 'Enrollment Confirmed',
              message: `You've been enrolled in ${course.title}`,
              link: `/learn/${courseId}`,
            });
          }

          console.log('[Webhook] Enrollment created for payment:', payment.id);
        }
      }
    } else if (eventType === 'payment.failed') {
      const payment = event.payload.payment.entity;
      const { userId, courseId } = payment.notes || {};

      if (userId) {
        // Insert failed payment record
        await supabaseAdmin.from('payments').insert({
          user_id: userId,
          course_id: courseId || null,
          razorpay_order_id: payment.order_id,
          razorpay_payment_id: payment.id,
          amount: payment.amount,
          currency: payment.currency?.toUpperCase() || 'INR',
          status: 'failed',
          method: payment.method || null,
        }).then(({ error: payError }) => {
          if (payError) {console.error('[Webhook] Failed payment record error:', payError);}
        });

        // Send failure notification
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          type: 'announcement',
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          link: '/courses',
        });
      }

      console.log('[Webhook] Payment failed:', payment.id);
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});
