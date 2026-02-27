import React, { useState, useEffect } from 'react';
import { Plus, Layers } from 'lucide-react';
import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';
import { useAdmin } from './AdminContext';
import { AdminModal } from './components/AdminModal';
import type { SiteContentItem } from '../../types';

export const ContentPage: React.FC = () => {
  const { showToast } = useAdmin();
  const [siteContent, setSiteContent] = useState<SiteContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    section: 'faq' as string,
    title: '',
    body: '',
    metadata: '{}',
    orderIndex: 0,
    isActive: true,
  });

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSiteContent();
      setSiteContent(res.items);
    } catch (err: any) {
      logger.error('Failed to fetch site content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContent(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ section: 'faq', title: '', body: '', metadata: '{}', orderIndex: 0, isActive: true });
    setShowModal(true);
  };

  const openEdit = (item: SiteContentItem) => {
    setEditingId(item.id);
    setFormData({
      section: item.section,
      title: item.title,
      body: item.body,
      metadata: JSON.stringify(item.metadata || {}, null, 2),
      orderIndex: item.orderIndex,
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.body) {
      showToast('Title and body are required', 'error');
      return;
    }
    let metadata: Record<string, any> = {};
    try { metadata = JSON.parse(formData.metadata); } catch { showToast('Invalid JSON in metadata', 'error'); return; }

    try {
      if (editingId) {
        await adminApi.updateSiteContent(editingId, {
          title: formData.title,
          body: formData.body,
          metadata,
          orderIndex: formData.orderIndex,
          isActive: formData.isActive,
        });
        showToast('Content updated!', 'success');
      } else {
        await adminApi.createSiteContent({
          section: formData.section,
          title: formData.title,
          body: formData.body,
          metadata,
          orderIndex: formData.orderIndex,
          isActive: formData.isActive,
        });
        showToast('Content created!', 'success');
      }
      setShowModal(false);
      setEditingId(null);
      fetchContent();
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    }
  };

  const handleDelete = async (item: SiteContentItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      await adminApi.deleteSiteContent(item.id);
      showToast('Content deleted', 'success');
      fetchContent();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Site Content Manager</h3>
          <button
            onClick={openCreate}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm"
          >
            <Plus size={16} /> New Content
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="text-slate-400">Loading content...</div></div>
        ) : siteContent.length === 0 ? (
          <div className="flex items-center justify-center py-20"><div className="text-slate-400">No content found</div></div>
        ) : (
          <div className="divide-y divide-slate-200">
            {(['faq', 'testimonial', 'showcase'] as const).map(section => {
              const items = siteContent.filter(c => c.section === section);
              if (items.length === 0) return null;
              return (
                <div key={section} className="p-6">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers size={14} />
                    {section}s ({items.length})
                  </h4>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          item.isActive ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200 opacity-60'
                        }`}
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-mono">#{item.orderIndex}</span>
                            <p className="font-medium text-slate-900 truncate">{item.title}</p>
                            {!item.isActive && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">Inactive</span>}
                          </div>
                          <p className="text-sm text-slate-500 truncate mt-1">{item.body}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openEdit(item)} className="text-brand-600 hover:text-brand-700 text-sm font-medium">Edit</button>
                          <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-700 text-sm font-medium">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Content Create/Edit Modal */}
      <AdminModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Edit Content' : 'New Content'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Section *</label>
            <select
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="faq">FAQ</option>
              <option value="testimonial">Testimonial</option>
              <option value="showcase">Showcase</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Title / Question"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Body *</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Answer / Description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Metadata (JSON)</label>
            <textarea
              value={formData.metadata}
              onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500 font-mono text-xs"
              placeholder='{"role": "Director", "image": "https://..."}'
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Order Index</label>
              <input
                type="number"
                value={formData.orderIndex}
                onChange={(e) => setFormData({ ...formData, orderIndex: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">Active</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setShowModal(false); setEditingId(null); }}
            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-medium transition"
          >
            {editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </AdminModal>
    </div>
  );
};
