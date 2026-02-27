import React, { useState, useEffect } from 'react';
import { Search, CreditCard } from 'lucide-react';
import { adminApi } from '../../services/api/admin.api';
import { useAdmin } from './AdminContext';
import { useDebounce } from './hooks/useDebounce';
import { usePagination } from './hooks/usePagination';
import { DataTable } from './components/DataTable';
import { StatusBadge } from './components/StatusBadge';
import { AdminModal } from './components/AdminModal';
import type { Payment } from '../../services/api/payments.api';

export const PaymentsPage: React.FC = () => {
  const { showToast } = useAdmin();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { pagination, setPage, setTotal } = usePagination(20);

  // Refund modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPayments({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
      });
      setPayments(res.payments);
      setTotal(res.total);
    } catch (err: any) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, [debouncedSearch, pagination.page]);

  const handleRefund = async () => {
    if (!refundPayment || !refundReason.trim()) {
      showToast('Please provide a reason', 'error');
      return;
    }
    try {
      await adminApi.processRefund(refundPayment.id, refundReason);
      showToast('Refund processed!', 'success');
      setShowRefundModal(false);
      setRefundPayment(null);
      fetchPayments();
    } catch (err: any) {
      showToast(err.message || 'Failed to process refund', 'error');
    }
  };

  // Revenue summaries
  const capturedRevenue = payments.filter(p => p.status === 'captured').reduce((s, p) => s + p.amount, 0);
  const refundedAmount = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Revenue summary */}
      {!loading && payments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-slate-900">{pagination.total}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Captured Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              ₹{(capturedRevenue / 100).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Refunded</p>
            <p className="text-2xl font-bold text-yellow-600">
              ₹{(refundedAmount / 100).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard size={20} /> Payment Manager
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search receipt # or payment ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-slate-900 focus:ring-1 focus:ring-brand-500 outline-none text-sm w-72"
            />
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: 'receipt',
              label: 'Receipt #',
              className: 'pl-6',
              render: (p: Payment) => <span className="font-mono text-xs text-slate-500">{p.receiptNumber || '—'}</span>,
            },
            {
              key: 'student',
              label: 'Student',
              render: (p: Payment) => (
                <div>
                  <div className="font-medium text-slate-900">{p.userName || '—'}</div>
                  <div className="text-xs text-slate-500">{p.userEmail || ''}</div>
                </div>
              ),
            },
            { key: 'course', label: 'Course', render: (p: Payment) => <span className="text-slate-700">{p.courseTitle || '—'}</span> },
            { key: 'amount', label: 'Amount', render: (p: Payment) => <span className="font-medium text-slate-900">₹{(p.amount / 100).toLocaleString('en-IN')}</span> },
            { key: 'status', label: 'Status', render: (p: Payment) => <StatusBadge status={p.status} /> },
            { key: 'date', label: 'Date', render: (p: Payment) => <span className="text-slate-500">{new Date(p.createdAt).toLocaleDateString('en-IN')}</span> },
            {
              key: 'action',
              label: 'Action',
              className: 'text-right pr-6',
              render: (p: Payment) => (
                <>
                  {p.status === 'captured' && (
                    <button
                      onClick={() => { setRefundPayment(p); setRefundReason(''); setShowRefundModal(true); }}
                      className="text-yellow-600 hover:text-yellow-700 font-medium text-sm"
                    >
                      Refund
                    </button>
                  )}
                  {p.status === 'refunded' && <span className="text-xs text-slate-400 italic">Refunded</span>}
                </>
              ),
            },
          ]}
          data={payments}
          loading={loading}
          emptyMessage="No payments found"
          loadingMessage="Loading payments..."
          rowKey={(p) => p.id}
          pagination={pagination}
          onPageChange={setPage}
        />
      </div>

      {/* Refund Modal */}
      <AdminModal
        open={showRefundModal && !!refundPayment}
        onClose={() => { setShowRefundModal(false); setRefundPayment(null); }}
        title="Process Refund"
      >
        {refundPayment && (
          <>
            <p className="text-slate-600 mb-2">
              Refunding <span className="font-bold text-slate-900">₹{(refundPayment.amount / 100).toLocaleString('en-IN')}</span> for{' '}
              <span className="font-medium">{refundPayment.courseTitle || 'Unknown Course'}</span>
            </p>
            <p className="text-xs text-slate-500 mb-4">Student: {refundPayment.userName || '—'}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Refund *</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Explain why this refund is being processed..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRefundModal(false); setRefundPayment(null); }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={!refundReason.trim()}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Refund
              </button>
            </div>
          </>
        )}
      </AdminModal>
    </div>
  );
};
