/**
 * Payments API - Transaction history, receipts, and refund processing
 */
import { extractEdgeFnError } from '../../utils/edgeFunctionError';
import { supabase } from '../supabase';

import type { PaymentRow } from '../../types/supabase';

export interface Payment {
  id: string;
  userId: string;
  courseId: string;
  enrollmentId: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'captured' | 'refunded' | 'failed';
  method: string | null;
  receiptNumber: string | null;
  refundId: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  refundedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  userName?: string;
  userEmail?: string;
  courseTitle?: string;
}

// Query result type for payment with user/course joins
type PaymentQueryRow = PaymentRow & {
  users?: { name: string; email: string } | null;
  courses?: { title: string } | null;
};

function mapRow(row: PaymentQueryRow): Payment {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    enrollmentId: row.enrollment_id,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status as Payment['status'],
    method: row.method,
    receiptNumber: row.receipt_number,
    refundId: row.refund_id,
    refundAmount: row.refund_amount,
    refundReason: row.refund_reason,
    refundedAt: row.refunded_at,
    metadata: (row.metadata || {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName: row.users?.name,
    userEmail: row.users?.email,
    courseTitle: row.courses?.title,
  };
}

export const paymentsApi = {
  async getUserPayments(params?: { page?: number; limit?: number }): Promise<{ payments: Payment[]; total: number }> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('payments')
      .select('*, courses(title)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {throw new Error(error.message);}
    return {
      payments: (data || []).map(mapRow),
      total: count || 0,
    };
  },

  async getPaymentByOrder(orderId: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, courses(title), users(name, email)')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (error) {throw new Error(error.message);}
    return data ? mapRow(data as unknown as PaymentQueryRow) : null;
  },

  async getAdminPayments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ payments: Payment[]; total: number }> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('payments')
      .select('*, users(name, email), courses(title)', { count: 'exact' });

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.search) {
      query = query.or(
        `receipt_number.ilike.%${params.search}%,razorpay_payment_id.ilike.%${params.search}%`
      );
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {throw new Error(error.message);}
    return {
      payments: ((data || []) as unknown as PaymentQueryRow[]).map(mapRow),
      total: count || 0,
    };
  },

  async processRefund(paymentId: string, reason: string): Promise<{ refundId: string; amount: number; message: string }> {
    const { data, error } = await supabase.functions.invoke('refund-process', {
      body: { paymentId, reason },
    });

    if (error) {throw new Error(await extractEdgeFnError(error, 'Refund failed'));}
    if (!data?.success) {throw new Error(data?.error || 'Refund failed');}
    return { refundId: data.refundId, amount: data.amount, message: `Refund processed (ID: ${data.refundId})` };
  },
};
