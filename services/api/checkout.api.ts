/**
 * Checkout API - Edge Function invocations for Razorpay
 * Replaces: apiClient.createOrder(), verifyPayment(), checkOrderStatus()
 */
import { extractEdgeFnError } from '../../utils/edgeFunctionError';
import { supabase } from '../supabase';

// Enrollment with joined course title (Supabase join result)
type EnrollmentWithCourse = {
  id: string;
  course_id: string;
  enrolled_at: string;
  courses: { title: string } | null;
};

export const checkoutApi = {
  /**
   * Creates a Razorpay order for a course purchase via the `checkout-create-order` Edge Function.
   *
   * The Edge Function holds the Razorpay API secret and returns the order ID, amount (in paise),
   * currency, and Razorpay public key for the frontend checkout modal. Pass `couponUseId`
   * from a prior `coupon-apply` Edge Function call to apply a discount to the order amount.
   *
   * @param courseId - UUID of the course being purchased.
   * @param couponUseId - Optional UUID from `coupon_uses` table; if provided, the discounted
   *   amount is reflected in the Razorpay order.
   * @returns Object with `orderId`, `amount` (paise), `currency`, `key` (Razorpay public key),
   *   `courseTitle`, and optionally `mock: true` in dev/test mode.
   * @throws {Error} If the Edge Function returns an error or the network call fails.
   *
   * @example
   * ```ts
   * const order = await checkoutApi.createOrder(courseId);
   * // Pass order.orderId, order.amount, order.key to the Razorpay checkout modal
   * ```
   */
  async createOrder(courseId: string, couponUseId?: string): Promise<{
    success: boolean;
    orderId?: string;
    amount: number;
    currency?: string;
    key?: string;
    courseTitle?: string;
    mock?: boolean;
    message?: string;
    warning?: string;
    /** When true, the total was ≤ ₹0 (upgrade credit / 100% coupon) — no Razorpay
     *  order was created; call claimFreeCourse instead. */
    freeClaim?: boolean;
    pricing?: { mode: 'list' | 'coupon' | 'upgrade'; basePrice: number; creditPaise: number; finalPrice: number };
  }> {
    const { data, error } = await supabase.functions.invoke('checkout-create-order', {
      body: { courseId, couponUseId },
    });

    if (error) {throw new Error(await extractEdgeFnError(error, 'Failed to create order'));}
    if (!data?.success) {throw new Error(data?.error || 'Failed to create order');}
    return data;
  },

  /**
   * Read-only upgrade quote for a bundle (calls the pure-read `get_upgrade_quote`
   * RPC, self-scoped). Returns the credit already paid and the discounted price.
   */
  async getUpgradeQuote(courseId: string): Promise<{
    basePrice: number | null;
    creditPaise: number;
    finalPrice: number | null;
    reason: string;
    sourcePaymentIds: string[];
  }> {
    const { data, error } = await supabase.rpc('get_upgrade_quote', { p_course_id: courseId });
    if (error) { throw error; }
    const q = (data ?? {}) as {
      base_price?: number | null; credit_paise?: number; final_price?: number | null;
      reason?: string; source_payment_ids?: string[];
    };
    return {
      basePrice: q.base_price ?? null,
      creditPaise: q.credit_paise ?? 0,
      finalPrice: q.final_price ?? null,
      reason: q.reason ?? 'NOT_ELIGIBLE',
      sourcePaymentIds: q.source_payment_ids ?? [],
    };
  },

  /**
   * Claim a course with no payment: genuinely free, upgrade credit covers the
   * full price, or a 100% coupon. Mirrors `claimFreeAsset`.
   */
  async claimFreeCourse(courseId: string, couponUseId?: string): Promise<{
    success: boolean;
    claimed: boolean;
    enrollmentId?: string;
    alreadyEnrolled?: boolean;
    bundleWarning?: string;
  }> {
    const { data, error } = await supabase.functions.invoke('course-claim-free', {
      body: { courseId, couponUseId },
    });
    if (error) { throw new Error(await extractEdgeFnError(error, 'Failed to claim course')); }
    if (!data?.success) { throw new Error(data?.error || 'Failed to claim course'); }
    return data;
  },

  /**
   * Verifies a Razorpay payment signature and creates an enrollment via the `checkout-verify` Edge Function.
   *
   * The Edge Function performs HMAC-SHA256 verification using `orderId|paymentId` and the
   * Razorpay secret key. It also fetches the Razorpay order to confirm the amount paid matches
   * the course price (defense-in-depth). On success, creates `enrollments` and `payments` records
   * and sends welcome + receipt emails via Resend.
   *
   * For BUNDLE purchases, also enrolls the user in all bundled courses. If any bundled course
   * enrollment fails, `bundleWarning` and `failedCourseIds` are returned but the main
   * enrollment still succeeds.
   *
   * @param params - Object with `orderId`, `paymentId`, `signature` (Razorpay HMAC), and `courseId`.
   *   Pass the same `couponUseId` used at order creation so the server can re-derive the discounted amount.
   * @returns Object with `verified: true`, `enrollmentId`, and optionally `bundleWarning`
   *   and `failedCourseIds` if bundle sub-enrollments partially failed.
   * @throws {Error} If signature verification fails, amount mismatches, or enrollment creation fails.
   *
   * @example
   * ```ts
   * const result = await checkoutApi.verifyPayment({ orderId, paymentId, signature, courseId });
   * if (result.verified) navigate(`/success?enrollmentId=${result.enrollmentId}`);
   * ```
   */
  async verifyPayment(params: {
    orderId: string;
    paymentId: string;
    signature?: string;
    courseId: string;
    couponUseId?: string;
  }): Promise<{
    success: boolean;
    verified: boolean;
    enrollmentId: string;
    mock?: boolean;
    message?: string;
    bundleWarning?: string;
    failedCourseIds?: string[];
    failedAssetIds?: string[];
  }> {
    const { data, error } = await supabase.functions.invoke('checkout-verify', {
      body: params,
    });

    if (error) {throw new Error(await extractEdgeFnError(error, 'Payment verification failed'));}
    if (!data?.success) {throw new Error(data?.error || 'Payment verification failed');}
    return data;
  },

  /**
   * Polls the `enrollments` table to check if an enrollment was created for a Razorpay order.
   *
   * Used after the Razorpay webhook flow: if `checkout-verify` did not fire (browser closed
   * before callback), the `checkout-webhook` Edge Function creates the enrollment asynchronously.
   * Poll this method to detect when the webhook has completed.
   *
   * @param orderId - The Razorpay order ID (e.g., `'order_ABC123'`).
   * @returns Object with `status: 'completed'` and `enrollment` details if found,
   *   or `status: 'pending'` if no enrollment exists yet for this order.
   *
   * @example
   * ```ts
   * // Poll every 2 seconds for up to 30 seconds
   * const result = await checkoutApi.checkOrderStatus(orderId);
   * if (result.status === 'completed') navigate('/dashboard');
   * ```
   */
  async checkOrderStatus(orderId: string): Promise<{
    success: boolean;
    status: 'pending' | 'completed';
    enrollment?: {
      id: string;
      courseId: string;
      courseTitle: string;
      enrolledAt: Date;
    };
  }> {
    // Check if enrollment exists for this order
    const { data } = await supabase
      .from('enrollments')
      .select('id, course_id, enrolled_at, courses(title)')
      .eq('order_id', orderId)
      .maybeSingle();

    if (data) {
      const enrollment = data as unknown as EnrollmentWithCourse;
      return {
        success: true,
        status: 'completed',
        enrollment: {
          id: enrollment.id,
          courseId: enrollment.course_id,
          courseTitle: enrollment.courses?.title || '',
          enrolledAt: new Date(enrollment.enrolled_at),
        },
      };
    }

    return { success: true, status: 'pending' };
  },

  // ──────────────────────────────────────────────────────────────────────
  // DIGITAL ASSETS (product-aware checkout — same Edge Functions, asset branch)
  // ──────────────────────────────────────────────────────────────────────

  /** Create a Razorpay order for a digital-asset purchase. Pass `couponUseId` from
   *  a prior `applyAssetCoupon` call to apply the discount. */
  async createAssetOrder(assetId: string, couponUseId?: string): Promise<{
    success: boolean;
    orderId: string;
    amount: number;
    currency: string;
    key: string;
    title: string;
  }> {
    const { data, error } = await supabase.functions.invoke('checkout-create-order', {
      body: { productType: 'asset', assetId, couponUseId },
    });
    if (error) { throw new Error(await extractEdgeFnError(error, 'Failed to create order')); }
    if (!data?.success) { throw new Error(data?.error || 'Failed to create order'); }
    return data;
  },

  /** Verify a Razorpay payment for a digital-asset purchase. Pass the same
   *  `couponUseId` so the server can re-derive the discounted amount. */
  async verifyAssetPayment(params: {
    orderId: string;
    paymentId: string;
    signature?: string;
    assetId: string;
    couponUseId?: string;
  }): Promise<{ success: boolean; verified: boolean; purchaseId: string }> {
    const { data, error } = await supabase.functions.invoke('checkout-verify', {
      body: { productType: 'asset', ...params },
    });
    if (error) { throw new Error(await extractEdgeFnError(error, 'Payment verification failed')); }
    if (!data?.success) { throw new Error(data?.error || 'Payment verification failed'); }
    return data;
  },

  /** Claim a free (price 0) asset without payment. Idempotent. */
  async claimFreeAsset(assetId: string): Promise<{ success: boolean; claimed: boolean }> {
    const { data, error } = await supabase.functions.invoke('asset-claim-free', {
      body: { assetId },
    });
    if (error) { throw new Error(await extractEdgeFnError(error, 'Could not claim asset')); }
    if (!data?.success) { throw new Error(data?.error || 'Could not claim asset'); }
    return data;
  },

  /** Poll asset_purchases for an order (webhook fallback when the browser closed). */
  async checkAssetOrderStatus(orderId: string): Promise<{ success: boolean; status: 'pending' | 'completed' }> {
    const { data } = await supabase
      .from('asset_purchases')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();
    return { success: true, status: data ? 'completed' : 'pending' };
  },
};
