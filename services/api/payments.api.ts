/**
 * Payments API - Transaction history, receipts, and refund processing
 */
import { supabase } from '../supabase';

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
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  userName?: string;
  userEmail?: string;
  courseTitle?: string;
}

function mapRow(row: any): Payment {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    enrollmentId: row.enrollment_id,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    method: row.method,
    receiptNumber: row.receipt_number,
    refundId: row.refund_id,
    refundAmount: row.refund_amount,
    refundReason: row.refund_reason,
    refundedAt: row.refunded_at,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName: row.users?.name,
    userEmail: row.users?.email,
    courseTitle: row.courses?.title,
  };
}

export const paymentsApi = {
  async getUserPayments(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, courses(title)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapRow);
  },

  async getPaymentByOrder(orderId: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, courses(title), users(name, email)')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapRow(data) : null;
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

    if (error) throw new Error(error.message);
    return {
      payments: (data || []).map(mapRow),
      total: count || 0,
    };
  },

  async processRefund(paymentId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (error) throw new Error(error.message);
  },
};
