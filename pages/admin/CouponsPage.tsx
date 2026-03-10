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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tag size={20} /> Coupon Manager
          </h3>
          <button
            onClick={() => setShowModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm"
          >
            <Plus size={16} /> New Coupon
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400">No coupons yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Uses</th>
                  <th className="p-4">Expires</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-bold text-slate-900">{c.code}</td>
                    <td className="p-4 text-green-600 font-bold">{c.discount_pct}%</td>
                    <td className="p-4 text-slate-600">
                      {c.use_count}{c.max_uses ? ` / ${c.max_uses}` : ''}
                    </td>
                    <td className="p-4 text-slate-500">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      {c.is_active && (
                        <button onClick={() => setDeactivateTarget(c)} className="text-red-600 hover:text-red-700 text-sm font-medium">
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER20"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Discount % *</label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.discount_pct}
              onChange={(e) => setForm({ ...form, discount_pct: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses (optional)</label>
            <input
              type="number"
              min={1}
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              placeholder="Leave blank for unlimited"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expires At (optional)</label>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-medium transition"
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
