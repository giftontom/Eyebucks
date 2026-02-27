// Eyebuckz LMS: Checkout - Create Razorpay Order
// Replaces: POST /api/checkout/create-order

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) return auth.errorResponse;
    const { user } = auth;

    const supabaseAdmin = createAdminClient();

    const { courseId } = await req.json();
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
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify({
        amount: course.price,
        currency: 'INR',
        receipt: `order_${courseId}_${user.id}`.substring(0, 40),
        notes: {
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
