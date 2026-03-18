// Eyebuckz LMS: Checkout - Verify Payment & Create Enrollment
// Replaces: POST /api/checkout/verify

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
import { enrollmentWelcomeEmail, paymentReceiptEmail } from '../_shared/emailTemplates.ts';
import { hmacSha256, timingSafeEqual } from '../_shared/hmac.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

/**
 * checkout-verify Edge Function — verifies a Razorpay payment signature and creates enrollment.
 *
 * Auth: JWT required (called by the frontend after the Razorpay checkout modal succeeds).
 * Method: POST
 *
 * Request body:
 * ```json
 * { "orderId": "order_ABC", "paymentId": "pay_XYZ", "signature": "hmac-hex", "courseId": "uuid" }
 * ```
 *
 * Response (success):
 * ```json
 * { "success": true, "verified": true, "enrollmentId": "uuid",
 *   "bundleWarning": "optional", "failedCourseIds": [] }
 * ```
 *
 * Security: HMAC-SHA256 signature verification using `orderId|paymentId` and
 * `RAZORPAY_KEY_SECRET`. Also fetches the Razorpay order to verify the paid amount
 * matches `courses.price` (defense-in-depth against price manipulation).
 *
 * Side effects:
 * - Inserts row in `enrollments` (UNIQUE on user_id+course_id prevents duplicates)
 * - For BUNDLE courses: upserts enrollment for each bundled course
 * - Inserts row in `payments`
 * - Inserts `enrollment` notification in `notifications`
 * - Sends enrollment welcome email and payment receipt via Resend (non-blocking)
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) {return auth.errorResponse;}
    const { user } = auth;

    const supabaseAdmin = createAdminClient();

    const { orderId, paymentId, signature, courseId } = await req.json();

    if (!orderId || !paymentId || !signature || !courseId) {
      return errorResponse(
        'Missing required fields (orderId, paymentId, signature, courseId)',
        corsHeaders,
        400
      );
    }

    // Verify Razorpay signature (mandatory)
    const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpaySecret) {
      console.error('[Checkout] RAZORPAY_KEY_SECRET not configured');
      return errorResponse('Payment verification not configured', corsHeaders, 500);
    }

    const expectedSignature = await hmacSha256(`${orderId}|${paymentId}`, razorpaySecret);
    const isValid = timingSafeEqual(expectedSignature, signature);
    if (!isValid) {
      return errorResponse('Invalid payment signature', corsHeaders, 400);
    }

    // Fetch course for amount and type
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('price, title, type')
      .eq('id', courseId)
      .single();

    if (!course) {
      return errorResponse('Course not found', corsHeaders, 404);
    }

    // Defense-in-depth: verify amount paid matches course price via Razorpay API (mandatory)
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    if (!razorpayKeyId) {
      console.error('[Checkout] RAZORPAY_KEY_ID not configured');
      return errorResponse('Payment verification not configured', corsHeaders, 500);
    }
    const rzpResponse = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpaySecret}`),
      },
    });
    if (!rzpResponse.ok) {
      console.error('[Checkout] Failed to fetch Razorpay order:', rzpResponse.status, await rzpResponse.text());
      return errorResponse('Payment gateway error — please contact support', corsHeaders, 503);
    }
    const rzpOrder = await rzpResponse.json();
    if (rzpOrder.amount !== course.price) {
      console.error(`[Checkout] Amount mismatch: Razorpay order=${rzpOrder.amount}, course=${course.price}`);
      return errorResponse('Payment amount mismatch', corsHeaders, 400);
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
        return errorResponse('Already enrolled', corsHeaders, 409);
      }
      console.error('[Checkout] Enrollment error:', enrollError);
      return errorResponse('Failed to create enrollment', corsHeaders, 500);
    }

    // If this is a BUNDLE, also enroll in all bundled courses
    let bundleWarning: string | undefined;
    const failedCourseIds: string[] = [];
    if (course.type === 'BUNDLE') {
      const { data: bundledCourses } = await supabaseAdmin
        .from('bundle_courses')
        .select('course_id')
        .eq('bundle_id', courseId);

      if (bundledCourses && bundledCourses.length > 0) {
        // Enroll each course individually so we can track per-course failures
        for (const bc of bundledCourses) {
          const { error: singleEnrollError } = await supabaseAdmin
            .from('enrollments')
            .upsert(
              {
                user_id: user.id,
                course_id: bc.course_id,
                status: 'ACTIVE',
                payment_id: paymentId,
                order_id: orderId,
                amount: 0,
                enrolled_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,course_id', ignoreDuplicates: true }
            );

          if (singleEnrollError) {
            console.error(`[Checkout] Bundle enrollment failed for course ${bc.course_id}:`, singleEnrollError);
            failedCourseIds.push(bc.course_id);
          }
        }

        if (failedCourseIds.length > 0) {
          bundleWarning = `${failedCourseIds.length} bundle course(s) could not be enrolled`;
        }
      }
    }

    // Insert payment record (must succeed — accounting depends on this)
    const receiptNumber = `EYB-${Date.now().toString(36).toUpperCase()}`;
    const { error: payError } = await supabaseAdmin.from('payments').insert({
      user_id: user.id,
      course_id: courseId,
      enrollment_id: enrollment.id,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      amount: course.price,
      currency: 'INR',
      status: 'captured',
      receipt_number: receiptNumber,
    });
    if (payError) {
      console.error('[Checkout] Payment record insert failed:', payError);
      return errorResponse('Enrollment succeeded but payment record could not be saved. Please contact support.', corsHeaders, 500);
    }

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
    if (userProfile?.email) {
      const appUrl = Deno.env.get('APP_URL') || 'https://eyebuckz.com';

      const learnUrl = `${appUrl}/#/learn/${courseId}`;
      const formattedAmount = (course.price / 100).toLocaleString('en-IN', {
        style: 'currency', currency: 'INR',
      });

      // Enrollment welcome email
      sendEmail(
        userProfile.email,
        `You're enrolled in ${course.title}!`,
        enrollmentWelcomeEmail({
          name: userProfile.name,
          courseTitle: course.title,
          learnUrl,
          appUrl,
        })
      );

      // Payment receipt email
      sendEmail(
        userProfile.email,
        `Payment Receipt — ${course.title}`,
        paymentReceiptEmail({
          name: userProfile.name,
          courseTitle: course.title,
          orderId,
          paymentId,
          amount: formattedAmount,
          learnUrl,
          appUrl,
        })
      );
    }

    return jsonResponse({
      success: true,
      verified: true,
      enrollmentId: enrollment.id,
      ...(bundleWarning && { bundleWarning, failedCourseIds }),
    }, corsHeaders);
  } catch (error) {
    console.error('[Checkout Verify] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
