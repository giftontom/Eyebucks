// Eyebuckz LMS: Course Claim Free — grant a course with no Razorpay payment.
// JWT required. Idempotent. Handles three ₹0 cases:
//   (a) genuinely free course (price 0)
//   (b) upgrade credit fully covers the bundle price (final < ₹1)
//   (c) a 100% coupon
// Razorpay rejects sub-100-paise orders, so these can't go through checkout.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
import { enrollmentWelcomeEmail } from '../_shared/emailTemplates.ts';
import { grantCourseAccess } from '../_shared/enrollment.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', corsHeaders, 405);
  }

  try {
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) { return auth.errorResponse; }
    const { user } = auth;

    const { courseId } = await req.json();
    if (!courseId) {
      return errorResponse('courseId is required', corsHeaders, 400);
    }

    const admin = createAdminClient();
    const { data: course } = await admin
      .from('courses')
      .select('id, title, price, type, status, deleted_at')
      .eq('id', courseId)
      .maybeSingle();

    if (!course || course.status !== 'PUBLISHED' || course.deleted_at) {
      return errorResponse('Course not found', corsHeaders, 404);
    }

    // Deterministic ₹0 marker order id so retries / double-clicks land in
    // apply_upgrade_credit's idempotent (already_applied) branch instead of
    // failing after the first call consumed the sources.
    const claimOrderId = `free_claim_${user.id}_${courseId}`;

    // Determine entitlement to a free claim (first match wins). Only two ways a
    // course is legitimately ₹0: it's genuinely free, or upgrade credit fully
    // covers it. Coupons are NOT a free-claim path here — they are not
    // course-scoped, so an unscoped 100% coupon must not grant an expensive
    // course; a coupon-discounted purchase always goes through Razorpay (clamped
    // to the ₹1 minimum in checkout-create-order).
    let mode: 'free' | 'upgrade' | null = null;

    if (course.price <= 0) {
      mode = 'free';
    } else {
      // Upgrade credit covers the whole price?
      const { data: quote } = await admin.rpc('get_upgrade_quote', {
        p_course_id: courseId, p_user_id: user.id,
      });
      if (quote?.reason === 'UPGRADE' && (quote.final_price ?? 999) < 100) {
        // Consume the ledger atomically (sub-₹1 waiver accepts paid_amount 0).
        const { error: upErr } = await admin.rpc('apply_upgrade_credit', {
          p_user_id: user.id, p_course_id: courseId, p_paid_amount: 0, p_order_id: claimOrderId,
        });
        if (upErr) {
          console.error('[course-claim-free] apply_upgrade_credit failed:', upErr);
          return errorResponse('Upgrade could not be applied — please contact support', corsHeaders, 400);
        }
        mode = 'upgrade';
      }
    }

    if (!mode) {
      return errorResponse('This course requires payment', corsHeaders, 400);
    }

    // Grant access (main enrollment + bundle fan-out), idempotent.
    const grant = await grantCourseAccess(admin, {
      userId: user.id,
      courseId,
      courseType: course.type as 'BUNDLE' | 'MODULE',
      paymentId: null,
      orderId: claimOrderId,
      amount: 0,
    });

    if (grant.alreadyEnrolled) {
      return jsonResponse({ success: true, claimed: true, alreadyEnrolled: true, enrollmentId: grant.enrollmentId }, corsHeaders);
    }

    // Auditable ₹0 payment row (the ledger/coupon consumption points at its order id).
    const receipt = `EYB-${Date.now().toString(36).toUpperCase()}`;
    const { error: payErr } = await admin.from('payments').insert({
      user_id: user.id,
      course_id: courseId,
      enrollment_id: grant.enrollmentId,
      razorpay_order_id: claimOrderId,
      amount: 0,
      currency: 'INR',
      status: 'captured',
      method: mode === 'upgrade' ? 'upgrade_credit' : 'free',
      receipt_number: receipt,
    });
    if (payErr) {
      console.error('[course-claim-free] payment record insert failed:', payErr);
      // Access already granted — don't fail the claim over the audit row.
    }

    // Notification + welcome email (best-effort).
    await admin.from('notifications').insert({
      user_id: user.id,
      type: 'enrollment',
      title: 'Enrollment Confirmed',
      message: `You've been enrolled in ${course.title}`,
      link: `/learn/${courseId}`,
    });

    const { data: profile } = await admin.from('users').select('name, email').eq('id', user.id).maybeSingle();
    if (profile?.email) {
      const appUrl = Deno.env.get('APP_URL') || 'https://eyebuckz.com';
      sendEmail(
        profile.email,
        `You're enrolled in ${course.title}!`,
        enrollmentWelcomeEmail({ name: profile.name, courseTitle: course.title, learnUrl: `${appUrl}/learn/${courseId}`, appUrl }),
      );
    }

    return jsonResponse({
      success: true,
      claimed: true,
      enrollmentId: grant.enrollmentId,
      ...(grant.failedCourseIds.length > 0 || grant.failedAssetIds.length > 0
        ? { bundleWarning: 'Some bundle items could not be granted', failedCourseIds: grant.failedCourseIds, failedAssetIds: grant.failedAssetIds }
        : {}),
    }, corsHeaders);
  } catch (error) {
    console.error('[course-claim-free] Error:', error);
    return errorResponse('Internal server error', getCorsHeaders(req), 500);
  }
});
