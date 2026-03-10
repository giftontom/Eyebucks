import { Plus, Tag } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { couponsApi } from '../../services/api/coupons.api';
import { logger } from '../../utils/logger';

import { useAdmin } from './AdminContext';
import { AdminModal } from './components/AdminModal';
import { ConfirmDialog } from './components/ConfirmDialog';

import type { Coupon } from '../../services/api/coupons.api';

export const CouponsPage: React.FC = () => {
  const { showToast } = useAdmin();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Coupon | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const [form, setForm] = useState({
    code: '',
    discount_pct: 10,
    max_uses: '',
    expires_at: '',
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const data = await couponsApi.adminListCoupons();
      setCoupons(data);
    } catch (err: any) {
      logger.error('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleCreate = async () => {
    if (!form.code.trim() || form.discount_pct < 1 || form.discount_pct > 100) {
      showToast('Code and valid discount % required', 'error');
      return;
    }
    try {
      await couponsApi.adminCreateCoupon({
        code: form.code,
        discount_pct: form.discount_pct,
        max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
        expires_at: form.expires_at || undefined,
      });
      showToast('Coupon created!', 'success');
      setShowModal(false);
      setForm({ code: '', discount_pct: 10, max_uses: '', expires_at: '' });
      fetchCoupons();
    } catch (err: any) {
      showToast(err.message || 'Failed to create coupon', 'error');
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) { return; }
    setDeactivating(true);
    try {
      await couponsApi.adminDeactivateCoupon(deactivateTarget.id);
      showToast('Coupon deactivated', 'success');
      setDeactivateTarget(null);
      fetchCoupons();
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="t-card rounded-xl t-border border shadow-sm overflow-hidden">
        <div className="p-6 border-b t-border flex justify-between items-center">
          <h3 className="text-xl font-bold t-text flex items-center gap-2">
            <Tag size={20} /> Coupon Manager
          </h3>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm transition"
          >
            <Plus size={16} /> New Coupon
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 t-text-2">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="flex items-center justify-center py-20 t-text-2">No coupons yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="t-bg-alt t-text-2 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Uses</th>
                  <th className="p-4">Expires</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y t-border">
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--surface-hover)] transition">
                    <td className="p-4 font-mono font-bold t-text">{c.code}</td>
                    <td className="p-4 font-bold" style={{ color: 'var(--status-success-text)' }}>{c.discount_pct}%</td>
                    <td className="p-4 t-text-2">
                      {c.use_count}{c.max_uses ? ` / ${c.max_uses}` : ''}
                    </td>
                    <td className="p-4 t-text-2">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.is_active ? 't-status-success' : 't-status-danger'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      {c.is_active && (
                        <button onClick={() => setDeactivateTarget(c)} className="text-sm font-medium transition hover:opacity-70" style={{ color: 'var(--status-danger-text)' }}>
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      <AdminModal open={showModal} onClose={() => setShowModal(false)} title="New Coupon" maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label htmlFor="coupon-code" className="block text-sm font-medium t-text-2 mb-1">Code *</label>
            <input
              id="coupon-code"
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER20"
              className="t-input w-full rounded-lg p-2.5 font-mono"
            />
          </div>
          <div>
            <label htmlFor="coupon-discount" className="block text-sm font-medium t-text-2 mb-1">Discount % *</label>
            <input
              id="coupon-discount"
              type="number"
              min={1}
              max={100}
              value={form.discount_pct}
              onChange={(e) => setForm({ ...form, discount_pct: parseInt(e.target.value) || 0 })}
              className="t-input w-full rounded-lg p-2.5"
            />
          </div>
          <div>
            <label htmlFor="coupon-max-uses" className="block text-sm font-medium t-text-2 mb-1">Max Uses (optional)</label>
            <input
              id="coupon-max-uses"
              type="number"
              min={1}
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              placeholder="Leave blank for unlimited"
              className="t-input w-full rounded-lg p-2.5"
            />
          </div>
          <div>
            <label htmlFor="coupon-expires" className="block text-sm font-medium t-text-2 mb-1">Expires At (optional)</label>
            <input
              id="coupon-expires"
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="t-input w-full rounded-lg p-2.5"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 t-card t-border border hover:bg-[var(--surface-hover)] t-text py-2 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg font-medium transition"
          >
            Create
          </button>
        </div>
      </AdminModal>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Coupon"
        message={`Deactivate coupon "${deactivateTarget?.code}"? Users will no longer be able to use it.`}
        confirmLabel="Deactivate"
        loading={deactivating}
      />
    </div>
  );
};
