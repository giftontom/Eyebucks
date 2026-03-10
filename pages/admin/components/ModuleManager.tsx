import { Plus } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { VideoUploader } from '../../../components/VideoUploader';
import { adminApi } from '../../../services/api/admin.api';
import { translateAdminError } from '../../../utils/adminErrors';
import { logger } from '../../../utils/logger';

import { AdminModal } from './AdminModal';
import { ConfirmDialog } from './ConfirmDialog';


import type { Module } from '../../../types';

interface ModuleManagerProps {
  courseId: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ModuleManager: React.FC<ModuleManagerProps> = ({ courseId, showToast }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Module form modal
  const [showModal, setShowModal] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [videoUploadMode, setVideoUploadMode] = useState<'url' | 'upload'>('url');
  const [formData, setFormData] = useState({
    title: '',
    duration: '',
    videoUrl: '',
    videoId: '',
    isFreePreview: false,
  });

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getModules(courseId);
      setModules(res.modules || []);
    } catch (err) {
      logger.error('Failed to fetch modules:', err);
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, [courseId]);

  const openCreate = () => {
    setEditingModuleId(null);
    setFormData({ title: '', duration: '', videoUrl: '', videoId: '', isFreePreview: false });
    setVideoUploadMode('url');
    setShowModal(true);
  };

  const openEdit = (module: Module) => {
    setEditingModuleId(module.id);
    setFormData({
      title: module.title,
      duration: module.duration,
      videoUrl: module.videoUrl,
      videoId: '',
      isFreePreview: module.isFreePreview,
    });
    setVideoUploadMode('url');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.duration || !formData.videoUrl) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(formData.duration)) {
      showToast('Duration must be in MM:SS format (e.g., 15:30)', 'error');
      return;
    }
    try {
      if (editingModuleId) {
        await adminApi.updateModule(courseId, editingModuleId, formData);
        showToast('Module updated!', 'success');
      } else {
        await adminApi.createModule(courseId, formData);
        showToast('Module created!', 'success');
      }
      setShowModal(false);
      setEditingModuleId(null);
      fetchModules();
    } catch (err: unknown) {
      showToast(translateAdminError(err), 'error');
    }
  };

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) {return;}
    try {
      await adminApi.deleteModule(courseId, deleteTarget.id);
      showToast('Module deleted!', 'success');
      setDeleteTarget(null);
      fetchModules();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete module', 'error');
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) {return;}

    const newOrder = [...modules];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    try {
      await adminApi.reorderModules(courseId, newOrder.map(m => m.id));
      setModules(newOrder);
      showToast(`Module moved ${direction}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reorder', 'error');
    }
  };

  if (loading) {
    return <div className="t-text-3 py-8 text-center">Loading modules...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold t-text">Modules ({modules.length})</h3>
        <button
          onClick={openCreate}
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm"
        >
          <Plus size={16} /> Add Module
        </button>
      </div>

      {modules.length === 0 ? (
        <div className="t-text-3 text-center py-12 border border-dashed t-border rounded-lg">
          No modules yet. Click "Add Module" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module, index) => (
            <div key={module.id} className="t-bg-alt t-border border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold t-text-3">#{index + 1}</span>
                    <h4 className="font-bold t-text">{module.title}</h4>
                    {module.isFreePreview && (
                      <span className="px-2 py-0.5 t-status-success text-xs font-bold rounded">FREE PREVIEW</span>
                    )}
                  </div>
                  <div className="text-sm t-text-2 space-y-1">
                    <div>Duration: <span className="font-medium">{module.duration}</span></div>
                    <div className="flex items-center gap-2">
                      Video:
                      <a href={module.videoUrl} target="_blank" rel="noopener noreferrer" className="t-link hover:t-link-hover text-xs truncate max-w-md">
                        {module.videoUrl}
                      </a>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 ml-4">
                  <button
                    onClick={() => handleReorder(index, 'up')}
                    disabled={index === 0}
                    className="text-xs px-2 py-1 t-bg-alt t-border border hover:bg-[var(--surface-hover)] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleReorder(index, 'down')}
                    disabled={index === modules.length - 1}
                    className="text-xs px-2 py-1 t-bg-alt t-border border hover:bg-[var(--surface-hover)] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t t-border">
                <button onClick={() => openEdit(module)} className="text-sm t-link hover:t-link-hover font-medium">Edit</button>
                <button onClick={() => setDeleteTarget(module)} className="text-sm font-medium hover:opacity-70" style={{ color: 'var(--status-danger-text)' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Module Create/Edit Modal */}
      <AdminModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingModuleId(null); }}
        title={editingModuleId ? 'Edit Module' : 'Create New Module'}
        maxWidth="max-w-lg"
        zIndex="z-[60]"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">Module Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Introduction to React"
            />
          </div>
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">Duration (MM:SS) *</label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="15:30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">Video Source *</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setVideoUploadMode('url')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  videoUploadMode === 'url' ? 'bg-brand-600 text-white' : 't-bg-alt t-border border hover:bg-[var(--surface-hover)] t-text-2'
                }`}
              >
                Enter URL
              </button>
              <button
                type="button"
                onClick={() => setVideoUploadMode('upload')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  videoUploadMode === 'upload' ? 'bg-brand-600 text-white' : 't-bg-alt t-border border hover:bg-[var(--surface-hover)] t-text-2'
                }`}
              >
                Upload Video
              </button>
            </div>
            {videoUploadMode === 'url' ? (
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="https://youtube.com/watch?v=..."
              />
            ) : (
              <VideoUploader
                initialVideoUrl={formData.videoUrl}
                onUploadComplete={(videoData) => {
                  const minutes = Math.floor(videoData.duration / 60);
                  const seconds = Math.floor(videoData.duration % 60);
                  setFormData(prev => ({
                    ...prev,
                    videoUrl: videoData.secureUrl,
                    videoId: videoData.publicId,
                    duration: videoData.duration > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : prev.duration,
                  }));
                }}
                onRemove={() => {
                  setFormData(prev => ({ ...prev, videoUrl: '', videoId: '' }));
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="modulePreview"
              checked={formData.isFreePreview}
              onChange={(e) => setFormData({ ...formData, isFreePreview: e.target.checked })}
              className="w-4 h-4 text-brand-600 t-border rounded focus:ring-brand-500"
            />
            <label htmlFor="modulePreview" className="text-sm t-text-2">
              Free Preview (Allow non-enrolled users to watch)
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setShowModal(false); setEditingModuleId(null); }}
            className="flex-1 t-card t-border border hover:bg-[var(--surface-hover)] t-text py-2 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg font-medium transition"
          >
            {editingModuleId ? 'Update Module' : 'Create Module'}
          </button>
        </div>
      </AdminModal>

      {/* Delete Module Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Module"
        message={
          <p>Are you sure you want to delete <span className="font-bold t-text">"{deleteTarget?.title}"</span>? This cannot be undone.</p>
        }
        confirmLabel="Delete Module"
      />
    </div>
  );
};
