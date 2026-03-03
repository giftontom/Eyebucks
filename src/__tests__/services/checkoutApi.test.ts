import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  };
  return { mockSupabase };
});

vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase,
}));

import { checkoutApi } from '../../../services/api/checkout.api';

describe('checkoutApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should invoke checkout-create-order Edge Function', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          orderId: 'order_123',
          amount: 99900,
          currency: 'INR',
          key: 'rzp_key',
          courseTitle: 'Test Course',
        },
        error: null,
      });

      const result = await checkoutApi.createOrder('course-1');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('checkout-create-order', {
        body: { courseId: 'course-1' },
      });
      expect(result.orderId).toBe('order_123');
      expect(result.amount).toBe(99900);
    });

    it('should throw on Edge Function error', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      await expect(checkoutApi.createOrder('c')).rejects.toThrow('Network error');
    });

    it('should throw when success is false', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: false, error: 'Course not found' },
        error: null,
      });

      await expect(checkoutApi.createOrder('c')).rejects.toThrow('Course not found');
    });
  });

  describe('verifyPayment', () => {
    it('should invoke checkout-verify and return enrollment', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          verified: true,
          enrollmentId: 'enroll-1',
        },
        error: null,
      });

      const result = await checkoutApi.verifyPayment({
        orderId: 'order_1',
        paymentId: 'pay_1',
        signature: 'sig_1',
        courseId: 'course-1',
      });

      expect(result.verified).toBe(true);
      expect(result.enrollmentId).toBe('enroll-1');
    });

    it('should throw on verification failure', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: false, error: 'Invalid payment signature' },
        error: null,
      });

      await expect(
        checkoutApi.verifyPayment({
          orderId: 'o',
          paymentId: 'p',
          signature: 'bad',
          courseId: 'c',
        })
      ).rejects.toThrow('Invalid payment signature');
    });

    it('should include bundle warning when present', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          verified: true,
          enrollmentId: 'enroll-1',
          bundleWarning: '1 course failed',
          failedCourseIds: ['course-5'],
        },
        error: null,
      });

      const result = await checkoutApi.verifyPayment({
        orderId: 'o',
        paymentId: 'p',
        courseId: 'c',
      });
      expect(result.bundleWarning).toBe('1 course failed');
      expect(result.failedCourseIds).toEqual(['course-5']);
    });
  });

  describe('checkOrderStatus', () => {
    it('should return pending when no enrollment found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await checkoutApi.checkOrderStatus('order_1');
      expect(result.status).toBe('pending');
    });

    it('should return completed with enrollment data', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'enroll-1',
                course_id: 'course-1',
                enrolled_at: '2024-06-01T00:00:00Z',
                courses: { title: 'React Course' },
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await checkoutApi.checkOrderStatus('order_1');
      expect(result.status).toBe('completed');
      expect(result.enrollment?.courseId).toBe('course-1');
      expect(result.enrollment?.courseTitle).toBe('React Course');
    });
  });
});
