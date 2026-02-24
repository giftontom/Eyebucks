/**
 * Checkout API - Edge Function invocations for Razorpay
 * Replaces: apiClient.createOrder(), verifyPayment(), checkOrderStatus()
 */
import { supabase } from '../supabase';

export const checkoutApi = {
  /**
   * Create a Razorpay order via Edge Function
   */
  async createOrder(courseId: string): Promise<{
    success: boolean;
    orderId: string;
    amount: number;
    currency: string;
    key: string;
    courseTitle: string;
    mock?: boolean;
    message?: string;
    warning?: string;
  }> {
    const { data, error } = await supabase.functions.invoke('checkout-create-order', {
      body: { courseId },
    });

    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Failed to create order');
    return data;
  },

  /**
   * Verify payment and create enrollment via Edge Function
   */
  async verifyPayment(params: {
    orderId: string;
    paymentId: string;
    signature?: string;
    courseId: string;
  }): Promise<{
    success: boolean;
    verified: boolean;
    enrollmentId: string;
    mock?: boolean;
    message?: string;
  }> {
    const { data, error } = await supabase.functions.invoke('checkout-verify', {
      body: params,
    });

    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Payment verification failed');
    return data;
  },

  /**
   * Check order status (for webhook-based enrollment)
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
      return {
        success: true,
        status: 'completed',
        enrollment: {
          id: data.id,
          courseId: data.course_id,
          courseTitle: (data as any).courses?.title || '',
          enrolledAt: new Date(data.enrolled_at),
        },
      };
    }

    return { success: true, status: 'pending' };
  },
};
