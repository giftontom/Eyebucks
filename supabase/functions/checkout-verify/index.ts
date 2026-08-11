// Eyebuckz LMS: Checkout - Verify Payment & Grant Access (product-aware)
// Course path = deployed v46 hardening (status='paid' + order-notes binding +
// coupon re-derivation), verbatim. Asset path = self-contained branch that grants
// an asset_purchase. Replaces: POST /api/checkout/verify

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
import { enrollmentWelcomeEmail, paymentReceiptEmail, assetDeliveryEmail } from '../_shared/emailTemplates.ts';
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

    const { orderId, paymentId, signature, courseId, assetId, productType, couponUseId } = await req.json();

    if (!orderId || !paymentId || !signature || (!courseId && !assetId)) {
      return errorResponse(
        'Missing required fields (orderId, paymentId, signature, and courseId or assetId)',
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

    // ──────────────────────────────────────────────────────────────────────
    // DIGITAL ASSET purchase — self-contained branch. Mirrors the course-path
    // hardening below (status='paid' + order-notes binding + amount re-derivation)
    // but grants an asset_purchase instead of an enrollment. The course path
    // below is left exactly as deployed (v46) and runs when this is not an asset.
    // ──────────────────────────────────────────────────────────────────────
    const isAsset = productType === 'asset' || (!courseId && !!assetId);
    if (isAsset) {
      const razorpayKeyIdA = Deno.env.get('RAZORPAY_KEY_ID');
      if (!razorpayKeyIdA) {
        console.error('[Checkout] RAZORPAY_KEY_ID not configured');
        return errorResponse('Payment verification not configured', corsHeaders, 500);
      }

      const { data: asset } = await supabaseAdmin
        .from('digital_assets')
        .select('id, slug, title, price')
        .eq('id', assetId)
        .single();
      if (!asset) {
        return errorResponse('Asset not found', corsHeaders, 404);
      }

      // Re-derive the expected amount, applying a coupon if one was redeemed.
      let expectedAssetAmount = asset.price;
      if (couponUseId) {
        const { data: couponUse } = await supabaseAdmin
          .from('coupon_uses')
          .select('user_id, asset_id, discount_pct')
          .eq('id', couponUseId)
          .maybeSingle();
        if (!couponUse || couponUse.user_id !== user.id || couponUse.asset_id !== asset.id) {
          return errorResponse('Invalid coupon reference', corsHeaders, 400);
        }
        expectedAssetAmount = Math.round(asset.price * (1 - couponUse.discount_pct / 100));
      }

      const rzpResA = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: { 'Authorization': 'Basic ' + btoa(`${razorpayKeyIdA}:${razorpaySecret}`) },
      });
      if (!rzpResA.ok) {
        console.error('[Checkout] Failed to fetch Razorpay order (asset):', rzpResA.status, await rzpResA.text());
        return errorResponse('Payment gateway error — please contact support', corsHeaders, 503);
      }
      const rzpOrderA = await rzpResA.json();
      if (rzpOrderA.status !== 'paid') {
        return errorResponse('Payment not completed', corsHeaders, 400);
      }
      // Bind the order to THIS asset + user (prevents product/order substitution).
      if (rzpOrderA.notes?.assetId !== asset.id || rzpOrderA.notes?.userId !== user.id) {
        console.error(`[Checkout] Asset order binding mismatch: notes=${JSON.stringify(rzpOrderA.notes)}`);
        return errorResponse('Order does not match this asset or user', corsHeaders, 400);
      }
      if (rzpOrderA.amount !== expectedAssetAmount) {
        console.error(`[Checkout] Asset amount mismatch: order=${rzpOrderA.amount}, expected=${expectedAssetAmount}`);
        return errorResponse('Payment amount mismatch', corsHeaders, 400);
      }

      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from('asset_purchases')
        .insert({
          user_id: user.id,
          asset_id: asset.id,
          status: 'ACTIVE',
          payment_id: paymentId,
          order_id: orderId,
          amount: expectedAssetAmount,
          purchased_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (purchaseError) {
        if (purchaseError.code === '23505') {
          return errorResponse('You already own this asset', corsHeaders, 409);
        }
        console.error('[Checkout] Asset purchase error:', purchaseError);
        return errorResponse('Failed to record purchase', corsHeaders, 500);
      }

      const receiptA = `EYB-${Date.now().toString(36).toUpperCase()}`;
      const { error: payErrorA } = await supabaseAdmin.from('payments').insert({
        user_id: user.id,
        asset_id: asset.id,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        amount: expectedAssetAmount,
        currency: 'INR',
        status: 'captured',
        receipt_number: receiptA,
      });
      if (payErrorA) {
        console.error('[Checkout] Asset payment record insert failed:', payErrorA);
        return errorResponse('Purchase succeeded but payment record could not be saved. Please contact support.', corsHeaders, 500);
      }

      // Mark the asset coupon consumed (A9 linkage).
      if (couponUseId) {
        await supabaseAdmin.from('coupon_uses')
          .update({ consumed_at: new Date().toISOString(), order_id: orderId })
          .eq('id', couponUseId).eq('user_id', user.id).is('consumed_at', null);
      }

      const { data: userProfileA } = await supabaseAdmin
        .from('users').select('name, email').eq('id', user.id).single();

      await supabaseAdmin.from('notifications').insert({
        user_id: user.id,
        type: 'announcement',
        title: 'Purchase confirmed',
        message: `${asset.title} is ready to download`,
        link: `/asset/${asset.slug}`,
      });

      if (userProfileA?.email) {
        const appUrlA = Deno.env.get('APP_URL') || 'https://eyebuckz.com';
        const formattedA = (expectedAssetAmount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
        sendEmail(
          userProfileA.email,
          `Your download — ${asset.title}`,
          assetDeliveryEmail({
            name: userProfileA.name,
            assetTitle: asset.title,
            orderId,
            paymentId,
            amount: formattedA,
            downloadUrl: `${appUrlA}/asset/${asset.slug}`,
            appUrl: appUrlA,
          }),
        );
      }

      return jsonResponse({ success: true, verified: true, purchaseId: purchase.id }, corsHeaders);
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

    // Expected amount is re-derived AFTER the Razorpay order fetch below, from
    // the pricingMode stamped into the order notes at create time (authoritative;
    // not trusted from the client body).
    let expectedAmount = course.price;
    let upgradeApplied = false;

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

    // The order must be fully paid.
    if (rzpOrder.status !== 'paid') {
      console.error(`[Checkout] Order not paid: status=${rzpOrder.status}`);
      return errorResponse('Payment not completed', corsHeaders, 400);
    }

    // Bind the order to THIS course and user. create-order stamps these into
    // notes; without this check a user could pay for course A and verify with a
    // same-priced course B (course substitution).
    if (rzpOrder.notes?.courseId !== courseId || rzpOrder.notes?.userId !== user.id) {
      console.error(`[Checkout] Order binding mismatch: notes=${JSON.stringify(rzpOrder.notes)}, courseId=${courseId}, userId=${user.id}`);
      return errorResponse('Order does not match this course or user', corsHeaders, 400);
    }

    // Re-derive the expected amount from the order notes (set at create time).
    // pricingMode is authoritative; a body couponUseId is only a legacy fallback.
    const notesMode = rzpOrder.notes?.pricingMode as string | undefined;
    const effCouponUseId: string | null = rzpOrder.notes?.couponUseId || couponUseId || null;
    if (notesMode === 'upgrade') {
      // Consume the ledger + validate final==paid atomically inside the RPC.
      const { error: cErr } = await supabaseAdmin.rpc('apply_upgrade_credit', {
        p_user_id: user.id,
        p_course_id: courseId,
        p_paid_amount: rzpOrder.amount,
        p_order_id: orderId,
      });
      if (cErr) {
        console.error('[Checkout] apply_upgrade_credit failed:', cErr);
        const msg = (cErr.message || '').includes('UPGRADE_AMOUNT_MISMATCH')
          ? 'Payment amount mismatch'
          : 'Upgrade pricing could not be applied — please contact support';
        return errorResponse(msg, corsHeaders, 400);
      }
      expectedAmount = rzpOrder.amount; // RPC validated final==paid (or already_applied)
      upgradeApplied = true;
    } else if (effCouponUseId) {
      const { data: couponUse } = await supabaseAdmin
        .from('coupon_uses')
        .select('user_id, course_id, discount_pct')
        .eq('id', effCouponUseId)
        .maybeSingle();
      if (!couponUse || couponUse.user_id !== user.id || couponUse.course_id !== courseId) {
        return errorResponse('Invalid coupon reference', corsHeaders, 400);
      }
      expectedAmount = Math.round(course.price * (1 - couponUse.discount_pct / 100));
    }

    if (rzpOrder.amount !== expectedAmount) {
      console.error(`[Checkout] Amount mismatch: Razorpay order=${rzpOrder.amount}, expected=${expectedAmount}`);
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
        amount: expectedAmount,
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

    // If this is a BUNDLE, also enroll in all bundled courses AND grant any
    // bundled digital assets.
    let bundleWarning: string | undefined;
    const failedCourseIds: string[] = [];
    const failedAssetIds: string[] = [];
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
      }

      // Grant bundled digital assets (amount 0 — revenue is on the parent
      // payment row; idempotent upsert on user_id+asset_id). Only grant assets
      // that are still PUBLISHED and not soft-deleted, so entitlement matches
      // what the storefront advertises (courses.api getCourse hydration).
      const { data: bundledAssets } = await supabaseAdmin
        .from('bundle_assets')
        .select('asset_id')
        .eq('bundle_id', courseId);

      if (bundledAssets && bundledAssets.length > 0) {
        const { data: grantableAssets } = await supabaseAdmin
          .from('digital_assets')
          .select('id')
          .in('id', bundledAssets.map(r => r.asset_id))
          .eq('status', 'PUBLISHED')
          .is('deleted_at', null);

        for (const ga of grantableAssets || []) {
          const { error: assetGrantError } = await supabaseAdmin
            .from('asset_purchases')
            .upsert(
              {
                user_id: user.id,
                asset_id: ga.id,
                status: 'ACTIVE',
                payment_id: paymentId,
                order_id: orderId,
                amount: 0,
                purchased_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,asset_id', ignoreDuplicates: true }
            );

          if (assetGrantError) {
            console.error(`[Checkout] Bundle asset grant failed for ${ga.id}:`, assetGrantError);
            failedAssetIds.push(ga.id);
          }
        }
      }

      if (failedCourseIds.length > 0 || failedAssetIds.length > 0) {
        const parts: string[] = [];
        if (failedCourseIds.length > 0) { parts.push(`${failedCourseIds.length} bundle course(s) could not be enrolled`); }
        if (failedAssetIds.length > 0) { parts.push(`${failedAssetIds.length} bundle asset(s) could not be granted`); }
        bundleWarning = parts.join('; ');
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
      amount: expectedAmount,
      currency: 'INR',
      status: 'captured',
      receipt_number: receiptNumber,
    });
    if (payError) {
      console.error('[Checkout] Payment record insert failed:', payError);
      return errorResponse('Enrollment succeeded but payment record could not be saved. Please contact support.', corsHeaders, 500);
    }

    // Mark the coupon consumed (A9 linkage) so an abandoned re-apply can't reuse
    // it, but a genuinely abandoned checkout leaves it un-consumed for re-issue.
    // Upgrade mode never has a coupon (mutually exclusive).
    if (!upgradeApplied && effCouponUseId) {
      await supabaseAdmin.from('coupon_uses')
        .update({ consumed_at: new Date().toISOString(), order_id: orderId })
        .eq('id', effCouponUseId).eq('user_id', user.id).is('consumed_at', null);
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

      const learnUrl = `${appUrl}/learn/${courseId}`;
      const formattedAmount = (expectedAmount / 100).toLocaleString('en-IN', {
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
      ...(bundleWarning && { bundleWarning, failedCourseIds, failedAssetIds }),
    }, corsHeaders);
  } catch (error) {
    console.error('[Checkout Verify] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
