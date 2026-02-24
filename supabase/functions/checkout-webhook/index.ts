// Eyebuckz LMS: Checkout - Razorpay Webhook Handler
// Replaces: POST /api/checkout/webhook
// Note: verify_jwt is disabled for this function (webhooks from Razorpay)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedSignature === signature;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

    // Verify webhook signature
    if (webhookSecret && signature) {
      const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('[Webhook] Invalid signature');
        return new Response('Invalid signature', { status: 400 });
      }
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
          await supabaseAdmin.from('enrollments').insert({
            user_id: userId,
            course_id: courseId,
            status: 'ACTIVE',
            payment_id: payment.id,
            order_id: payment.order_id,
            amount: payment.amount,
            enrolled_at: new Date().toISOString(),
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
      const { userId } = payment.notes || {};

      if (userId) {
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
