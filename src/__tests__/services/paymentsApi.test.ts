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

import { paymentsApi } from '../../../services/api/payments.api';

describe('paymentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPayments', () => {
    it('should fetch payments with pagination', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'pay-1',
                  user_id: 'u1',
                  course_id: 'c1',
                  enrollment_id: 'e1',
                  razorpay_order_id: 'order_1',
                  razorpay_payment_id: 'pay_rzp_1',
                  amount: 99900,
                  currency: 'INR',
                  status: 'captured',
                  method: 'upi',
                  receipt_number: 'EYB-001',
                  refund_id: null,
                  refund_amount: null,
                  refund_reason: null,
                  refunded_at: null,
                  metadata: {},
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  courses: { title: 'Test Course' },
                },
              ],
              error: null,
              count: 1,
            }),
          }),
        }),
      });

      const result = await paymentsApi.getUserPayments({ page: 1, limit: 10 });
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].amount).toBe(99900);
      expect(result.payments[0].courseTitle).toBe('Test Course');
      expect(result.total).toBe(1);
    });

    it('should throw on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB error' },
              count: 0,
            }),
          }),
        }),
      });

      await expect(paymentsApi.getUserPayments()).rejects.toThrow('DB error');
    });
  });

  describe('getPaymentByOrder', () => {
    it('should return null when not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await paymentsApi.getPaymentByOrder('nonexistent');
      expect(result).toBeNull();
    });

    it('should return payment by order ID', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'pay-1',
                user_id: 'u1',
                course_id: 'c1',
                razorpay_order_id: 'order_1',
                amount: 49900,
                currency: 'INR',
                status: 'captured',
                metadata: {},
                created_at: '2024-01-01',
                updated_at: '2024-01-01',
                courses: { title: 'Film Course' },
                users: { name: 'John', email: 'john@test.com' },
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await paymentsApi.getPaymentByOrder('order_1');
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(49900);
      expect(result!.userName).toBe('John');
    });
  });

  describe('processRefund', () => {
    it('should invoke refund-process Edge Function', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, refundId: 'rfnd_123', amount: 99900 },
        error: null,
      });

      const result = await paymentsApi.processRefund('pay-1', 'Customer request');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('refund-process', {
        body: { paymentId: 'pay-1', reason: 'Customer request' },
      });
      expect(result.refundId).toBe('rfnd_123');
    });

    it('should throw on Edge Function error', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Server error' },
      });

      await expect(paymentsApi.processRefund('p', 'r')).rejects.toThrow('Server error');
    });

    it('should throw when refund fails at Razorpay', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: false, error: 'Payment already refunded' },
        error: null,
      });

      await expect(paymentsApi.processRefund('p', 'r')).rejects.toThrow('Payment already refunded');
    });
  });

  describe('getAdminPayments', () => {
    it('should filter by status', async () => {
      const eqMock = vi.fn().mockReturnValue({
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: eqMock,
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
          }),
        }),
      });

      await paymentsApi.getAdminPayments({ status: 'refunded' });
      expect(mockSupabase.from).toHaveBeenCalledWith('payments');
    });

    it('should filter by search term', async () => {
      const orMock = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ or: orMock }),
      });

      const result = await paymentsApi.getAdminPayments({ search: 'REC-001' });
      expect(result.total).toBe(0);
      expect(result.payments).toEqual([]);
    });

    it('should return all without filters', async () => {
      const mockPaymentRow = {
        id: 'p1', user_id: 'u1', course_id: 'c1', razorpay_order_id: null,
        razorpay_payment_id: null, amount: 99900, currency: 'INR', status: 'captured',
        method: null, receipt_number: null, refund_id: null, refund_amount: null,
        refund_reason: null, refunded_at: null, metadata: {}, enrollment_id: null,
        created_at: '2024-01-01', updated_at: '2024-01-01',
        courses: null, users: null,
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [mockPaymentRow], error: null, count: 1 }),
          }),
        }),
      });

      const result = await paymentsApi.getAdminPayments();
      expect(result.total).toBe(1);
      expect(result.payments[0].amount).toBe(99900);
    });
  });
});
