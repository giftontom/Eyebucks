// Eyebuckz LMS: Checkout - Verify Payment & Create Enrollment
// Replaces: POST /api/checkout/verify

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const body = `${orderId}|${paymentId}`;
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, paymentId, signature, courseId } = await req.json();

    if (!orderId || !paymentId || !courseId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify Razorpay signature
    if (signature) {
      const isValid = await verifyRazorpaySignature(
        orderId,
        paymentId,
        signature,
        Deno.env.get('RAZORPAY_KEY_SECRET')!
      );

      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid payment signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch course for amount
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('price, title')
      .eq('id', courseId)
      .single();

    if (!course) {
      return new Response(
        JSON.stringify({ success: false, error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create enrollment (using service_role to bypass RLS)
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .insert({
        user_id: user.id,
        course_id: courseId,
        status: 'ACTIVE',
        payment_id: paymentId,
        order_id: orderId,
        amount: course.price,
        enrolled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (enrollError) {
      // Check for duplicate enrollment
      if (enrollError.code === '23505') {
        return new Response(
          JSON.stringify({ success: false, error: 'Already enrolled' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('[Checkout] Enrollment error:', enrollError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create enrollment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert payment record
    const receiptNumber = `EYB-${Date.now().toString(36).toUpperCase()}`;
    await supabaseAdmin.from('payments').insert({
      user_id: user.id,
      course_id: courseId,
      enrollment_id: enrollment.id,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      amount: course.price,
      currency: 'INR',
      status: 'captured',
      receipt_number: receiptNumber,
    }).then(({ error: payError }) => {
      if (payError) console.error('[Checkout] Payment record error:', payError);
    });

    // Get user profile for email
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .single();

    // Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: user.id,
      type: 'enrollment',
      title: 'Enrollment Confirmed',
      message: `You've been enrolled in ${course.title}`,
      link: `/learn/${courseId}`,
    });

    // Send confirmation email via Resend (non-blocking)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && userProfile?.email) {
      const appUrl = Deno.env.get('APP_URL') || 'https://eyebuckz.com';
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@eyebuckz.com';

      // Fire and forget - don't block response
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: userProfile.email,
          subject: `Welcome to ${course.title}!`,
          html: `
            <h2>Welcome to ${course.title}!</h2>
            <p>Hi ${userProfile.name},</p>
            <p>Congratulations! You're now enrolled. Start learning now:</p>
            <p><a href="${appUrl}/#/learn/${courseId}">Start Learning</a></p>
          `,
        }),
      }).catch(err => console.error('[Email] Send error:', err));

      // Send payment receipt
      const formattedAmount = (course.price / 100).toLocaleString('en-IN', {
        style: 'currency', currency: 'INR',
      });
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: userProfile.email,
          subject: `Payment Receipt - ${course.title}`,
          html: `
            <h2>Payment Receipt</h2>
            <p>Hi ${userProfile.name},</p>
            <p>Your payment for <strong>${course.title}</strong> has been processed.</p>
            <p>Order ID: ${orderId}</p>
            <p>Payment ID: ${paymentId}</p>
            <p>Amount: ${formattedAmount}</p>
          `,
        }),
      }).catch(err => console.error('[Email] Receipt error:', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        enrollmentId: enrollment.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Checkout Verify] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
