import { Search, CreditCard, Download } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';

import { useAdmin } from './AdminContext';
import { AdminModal } from './components/AdminModal';
import { DataTable } from './components/DataTable';
import { StatusBadge } from './components/StatusBadge';
import { useDebounce } from './hooks/useDebounce';
import { usePagination } from './hooks/usePagination';

import type { Payment } from '../../services/api/payments.api';

export const PaymentsPage: React.FC = () => {
  const { showToast } = useAdmin();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { pagination, setPage, setTotal } = usePagination(20);

  // Revenue totals (from aggregate query, not current page)
  const [totalRevenue, setTotalRevenue] = useState(0);

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
      logger.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, [debouncedSearch, pagination.page]);

  // Fetch aggregate revenue from admin stats (not page-dependent)
  useEffect(() => {
    adminApi.getStats()
      .then(res => setTotalRevenue(res.stats.totalRevenue))
      .catch(() => {});
  }, []);

  const handleExportCSV = () => {
    const headers = ['Receipt #', 'Student', 'Email', 'Course', 'Amount (₹)', 'Status', 'Date'];
    const rows = payments.map(p => [
      p.receiptNumber || '',
      p.userName || '',
      p.userEmail || '',
      p.courseTitle || '',
      (p.amount / 100).toFixed(2),
      p.status,
      new Date(p.createdAt).toLocaleDateString('en-IN'),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  // Page-level refund total (aggregate captured comes from stats)
  const refundedAmount = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Revenue summary */}
      {!loading && payments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="t-card t-border border p-5 rounded-xl shadow-sm">
            <p className="text-xs font-bold t-text-2 uppercase tracking-wider mb-1">Total Transactions</p>
            <p className="text-2xl font-bold t-text">{pagination.total}</p>
          </div>
          <div className="t-card t-border border p-5 rounded-xl shadow-sm">
            <p className="text-xs font-bold t-text-2 uppercase tracking-wider mb-1">Total Revenue</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--status-success-text)' }}>
              ₹{(totalRevenue / 100).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="t-card t-border border p-5 rounded-xl shadow-sm">
            <p className="text-xs font-bold t-text-2 uppercase tracking-wider mb-1">Refunded</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--status-warning-text)' }}>
              ₹{(refundedAmount / 100).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}

      <div className="t-card t-border border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b t-border flex justify-between items-center gap-4 flex-wrap">
          <h3 className="text-xl font-bold t-text flex items-center gap-2">
            <CreditCard size={20} /> Payment Manager
          </h3>
          <div className="flex items-center gap-3">
            {payments.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                <Download size={14} /> Export CSV
              </button>
            )}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 t-text-3" size={16} />
            <input
              type="text"
              placeholder="Search receipt # or payment ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="t-input-bg t-border border rounded-lg pl-10 pr-4 py-2 t-text focus:ring-1 focus:ring-brand-500 outline-none text-sm w-72"
            />
          </div>
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: 'receipt',
              label: 'Receipt #',
              className: 'pl-6',
              render: (p: Payment) => <span className="font-mono text-xs t-text-2">{p.receiptNumber || '—'}</span>,
            },
            {
              key: 'student',
              label: 'Student',
              render: (p: Payment) => (
                <div>
                  <div className="font-medium t-text">{p.userName || '—'}</div>
                  <div className="text-xs t-text-2">{p.userEmail || ''}</div>
                </div>
              ),
            },
            { key: 'course', label: 'Course', render: (p: Payment) => <span className="t-text">{p.courseTitle || '—'}</span> },
            { key: 'amount', label: 'Amount', render: (p: Payment) => <span className="font-medium t-text">₹{(p.amount / 100).toLocaleString('en-IN')}</span> },
            { key: 'status', label: 'Status', render: (p: Payment) => <StatusBadge status={p.status} /> },
            { key: 'date', label: 'Date', render: (p: Payment) => <span className="t-text-2">{new Date(p.createdAt).toLocaleDateString('en-IN')}</span> },
            {
              key: 'action',
              label: 'Action',
              className: 'text-right pr-6',
              render: (p: Payment) => (
                <>
                  {p.status === 'captured' && (
                    <button
                      onClick={() => { setRefundPayment(p); setRefundReason(''); setShowRefundModal(true); }}
                      className="font-medium text-sm hover:opacity-70"
                      style={{ color: 'var(--status-warning-text)' }}
                    >
                      Refund
                    </button>
                  )}
                  {p.status === 'refunded' && <span className="text-xs t-text-3 italic">Refunded</span>}
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
            <p className="t-text-2 mb-2">
              Refunding <span className="font-bold t-text">₹{(refundPayment.amount / 100).toLocaleString('en-IN')}</span> for{' '}
              <span className="font-medium">{refundPayment.courseTitle || 'Unknown Course'}</span>
            </p>
            <p className="text-xs t-text-2 mb-4">Student: {refundPayment.userName || '—'}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium t-text-2 mb-2">Reason for Refund *</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Explain why this refund is being processed..."
                rows={3}
                className="w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRefundModal(false); setRefundPayment(null); }}
                className="flex-1 t-card t-border border hover:bg-[var(--surface-hover)] t-text py-2 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={!refundReason.trim()}
                className="flex-1 t-status-warning border py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
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
