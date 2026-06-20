import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { VideoUploader } from '../../../components/VideoUploader';
import { adminApi } from '../../../services/api/admin.api';
import { translateAdminError } from '../../../utils/adminErrors';
import { logger } from '../../../utils/logger';

import { AdminModal } from './AdminModal';
import { ConfirmDialog } from './ConfirmDialog';


import type { Module, Lesson } from '../../../types';

interface ModuleManagerProps {
  courseId: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const emptyLessonForm = { title: '', duration: '', videoUrl: '', videoId: '', isFreePreview: false };

export const ModuleManager: React.FC<ModuleManagerProps> = ({ courseId, showToast }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Chapter (module) modal
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');

  // Lesson modal
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [videoUploadMode, setVideoUploadMode] = useState<'url' | 'upload'>('url');
  const [lessonForm, setLessonForm] = useState(emptyLessonForm);

  // Delete confirms
  const [deleteChapter, setDeleteChapter] = useState<Module | null>(null);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<{ moduleId: string; lesson: Lesson } | null>(null);

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

  // ---- Chapter (module) handlers ----
  const openCreateChapter = () => {
    setEditingChapterId(null);
    setChapterTitle('');
    setShowChapterModal(true);
  };

  const openEditChapter = (module: Module) => {
    setEditingChapterId(module.id);
    setChapterTitle(module.title);
    setShowChapterModal(true);
  };

  const handleSaveChapter = async () => {
    if (!chapterTitle.trim()) {
      showToast('Please enter a chapter title', 'error');
      return;
    }
    try {
      if (editingChapterId) {
        await adminApi.updateModule(courseId, editingChapterId, { title: chapterTitle.trim() });
        showToast('Chapter updated!', 'success');
      } else {
        await adminApi.createModule(courseId, { title: chapterTitle.trim() });
        showToast('Chapter created!', 'success');
      }
      setShowChapterModal(false);
      setEditingChapterId(null);
      fetchModules();
    } catch (err: unknown) {
      showToast(translateAdminError(err), 'error');
    }
  };

  const confirmDeleteChapter = async () => {
    if (!deleteChapter) {return;}
    try {
      await adminApi.deleteModule(courseId, deleteChapter.id);
      showToast('Chapter deleted!', 'success');
      setDeleteChapter(null);
      fetchModules();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete chapter', 'error');
    }
  };

  const handleReorderChapter = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) {return;}

    const newOrder = [...modules];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    try {
      await adminApi.reorderModules(courseId, newOrder.map(m => m.id));
      setModules(newOrder);
      showToast(`Chapter moved ${direction}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reorder', 'error');
    }
  };

  // ---- Lesson handlers ----
  const openCreateLesson = (moduleId: string) => {
    setLessonModuleId(moduleId);
    setEditingLessonId(null);
    setLessonForm(emptyLessonForm);
    setVideoUploadMode('url');
    setShowLessonModal(true);
  };

  const openEditLesson = (moduleId: string, lesson: Lesson) => {
    setLessonModuleId(moduleId);
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      duration: lesson.duration,
      videoUrl: lesson.videoUrl,
      videoId: '',
      isFreePreview: lesson.isFreePreview,
    });
    setVideoUploadMode('url');
    setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonModuleId) {return;}
    if (!lessonForm.title || !lessonForm.duration || !lessonForm.videoUrl) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(lessonForm.duration)) {
      showToast('Duration must be in MM:SS format (e.g., 15:30)', 'error');
      return;
    }
    try {
      if (editingLessonId) {
        await adminApi.updateLesson(lessonModuleId, editingLessonId, lessonForm);
        showToast('Lesson updated!', 'success');
      } else {
        await adminApi.createLesson(lessonModuleId, lessonForm);
        showToast('Lesson created!', 'success');
      }
      setShowLessonModal(false);
      setEditingLessonId(null);
      setLessonModuleId(null);
      fetchModules();
    } catch (err: unknown) {
      showToast(translateAdminError(err), 'error');
    }
  };

  const confirmDeleteLesson = async () => {
    if (!deleteLessonTarget) {return;}
    try {
      await adminApi.deleteLesson(deleteLessonTarget.moduleId, deleteLessonTarget.lesson.id);
      showToast('Lesson deleted!', 'success');
      setDeleteLessonTarget(null);
      fetchModules();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete lesson', 'error');
    }
  };

  const handleReorderLesson = async (moduleId: string, lessons: Lesson[], index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) {return;}

    const newOrder = [...lessons];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    try {
      await adminApi.reorderLessons(moduleId, newOrder.map(l => l.id));
      setModules(prev => prev.map(m => (m.id === moduleId ? { ...m, lessons: newOrder } : m)));
      showToast(`Lesson moved ${direction}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reorder', 'error');
    }
  };

  if (loading) {
    return <div className="t-text-3 py-8 text-center">Loading chapters...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold t-text">Chapters ({modules.length})</h3>
        <button
          onClick={openCreateChapter}
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm"
        >
          <Plus size={16} /> Add Chapter
        </button>
      </div>

      {modules.length === 0 ? (
        <div className="t-text-3 text-center py-12 border border-dashed t-border rounded-lg">
          No chapters yet. Click "Add Chapter" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module, index) => {
            const lessons = module.lessons ?? [];
            return (
              <div key={module.id} className="t-bg-alt t-border border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold t-text-3">#{index + 1}</span>
                      <h4 className="font-bold t-text">{module.title}</h4>
                    </div>
                    <div className="text-xs t-text-3">{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex flex-col gap-1 ml-4">
                    <button
                      onClick={() => handleReorderChapter(index, 'up')}
                      disabled={index === 0}
                      className="text-xs px-2 py-1 t-bg-alt t-border border hover:bg-[var(--surface-hover)] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move chapter up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => handleReorderChapter(index, 'down')}
                      disabled={index === modules.length - 1}
                      className="text-xs px-2 py-1 t-bg-alt t-border border hover:bg-[var(--surface-hover)] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move chapter down"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>

                {/* Lessons in this chapter */}
                {lessons.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {lessons.map((lesson, lIdx) => (
                      <div key={lesson.id} className="flex items-start justify-between gap-3 t-bg t-border border rounded-md p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold t-text-3">{index + 1}.{lIdx + 1}</span>
                            <span className="text-sm font-medium t-text truncate">{lesson.title}</span>
                            {lesson.isFreePreview && (
                              <span className="px-1.5 py-0.5 t-status-success text-[10px] font-bold rounded">FREE</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs t-text-2">
                            <span className="font-mono">{lesson.duration}</span>
                            {lesson.videoUrl && (
                              <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="t-link hover:t-link-hover truncate max-w-[16rem]">
                                {lesson.videoUrl}
                              </a>
                            )}
                          </div>
                          <div className="flex gap-3 mt-2">
                            <button onClick={() => openEditLesson(module.id, lesson)} className="text-xs t-link hover:t-link-hover font-medium">Edit</button>
                            <button onClick={() => setDeleteLessonTarget({ moduleId: module.id, lesson })} className="text-xs font-medium hover:opacity-70" style={{ color: 'var(--status-danger-text)' }}>Delete</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleReorderLesson(module.id, lessons, lIdx, 'up')}
                            disabled={lIdx === 0}
                            className="text-xs px-2 py-0.5 t-bg-alt t-border border hover:bg-[var(--surface-hover)] rounded disabled:opacity-30"
                            aria-label="Move lesson up"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={() => handleReorderLesson(module.id, lessons, lIdx, 'down')}
                            disabled={lIdx === lessons.length - 1}
                            className="text-xs px-2 py-0.5 t-bg-alt t-border border hover:bg-[var(--surface-hover)] rounded disabled:opacity-30"
                            aria-label="Move lesson down"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 mt-3 pt-3 border-t t-border">
                  <button onClick={() => openCreateLesson(module.id)} className="text-sm t-link hover:t-link-hover font-medium flex items-center gap-1">
                    <Plus size={14} /> Add Lesson
                  </button>
                  <button onClick={() => openEditChapter(module)} className="text-sm t-link hover:t-link-hover font-medium">Edit Chapter</button>
                  <button onClick={() => setDeleteChapter(module)} className="text-sm font-medium hover:opacity-70" style={{ color: 'var(--status-danger-text)' }}>Delete Chapter</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chapter Create/Edit Modal */}
      <AdminModal
        open={showChapterModal}
        onClose={() => { setShowChapterModal(false); setEditingChapterId(null); }}
        title={editingChapterId ? 'Edit Chapter' : 'Create New Chapter'}
        maxWidth="max-w-lg"
        zIndex="z-[60]"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">Chapter Title *</label>
            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              className="w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Getting Started"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setShowChapterModal(false); setEditingChapterId(null); }}
            className="flex-1 t-card t-border border hover:bg-[var(--surface-hover)] t-text py-2 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChapter}
            className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg font-medium transition"
          >
            {editingChapterId ? 'Update Chapter' : 'Create Chapter'}
          </button>
        </div>
      </AdminModal>

      {/* Lesson Create/Edit Modal */}
      <AdminModal
        open={showLessonModal}
        onClose={() => { setShowLessonModal(false); setEditingLessonId(null); setLessonModuleId(null); }}
        title={editingLessonId ? 'Edit Lesson' : 'Create New Lesson'}
        maxWidth="max-w-lg"
        zIndex="z-[60]"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">Lesson Title *</label>
            <input
              type="text"
              value={lessonForm.title}
              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
              className="w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Introduction to React"
            />
          </div>
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">Duration (MM:SS) *</label>
            <input
              type="text"
              value={lessonForm.duration}
              onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
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
                value={lessonForm.videoUrl}
                onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                className="w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="https://vz-....b-cdn.net/{guid}/playlist.m3u8"
              />
            ) : (
              <VideoUploader
                initialVideoUrl={lessonForm.videoUrl}
                onUploadComplete={(videoData) => {
                  const minutes = Math.floor(videoData.duration / 60);
                  const seconds = Math.floor(videoData.duration % 60);
                  setLessonForm(prev => ({
                    ...prev,
                    videoUrl: videoData.secureUrl,
                    videoId: videoData.publicId,
                    duration: videoData.duration > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : prev.duration,
                  }));
                }}
                onRemove={() => {
                  setLessonForm(prev => ({ ...prev, videoUrl: '', videoId: '' }));
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="lessonPreview"
              checked={lessonForm.isFreePreview}
              onChange={(e) => setLessonForm({ ...lessonForm, isFreePreview: e.target.checked })}
              className="w-4 h-4 text-brand-600 t-border rounded focus:ring-brand-500"
            />
            <label htmlFor="lessonPreview" className="text-sm t-text-2">
              Free Preview (Allow non-enrolled users to watch)
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setShowLessonModal(false); setEditingLessonId(null); setLessonModuleId(null); }}
            className="flex-1 t-card t-border border hover:bg-[var(--surface-hover)] t-text py-2 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveLesson}
            className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg font-medium transition"
          >
            {editingLessonId ? 'Update Lesson' : 'Create Lesson'}
          </button>
        </div>
      </AdminModal>

      {/* Delete Chapter Confirm */}
      <ConfirmDialog
        open={!!deleteChapter}
        onClose={() => setDeleteChapter(null)}
        onConfirm={confirmDeleteChapter}
        title="Delete Chapter"
        message={
          <p>Delete <span className="font-bold t-text">"{deleteChapter?.title}"</span> and all its lessons (and student progress for them)? This cannot be undone.</p>
        }
        confirmLabel="Delete Chapter"
      />

      {/* Delete Lesson Confirm */}
      <ConfirmDialog
        open={!!deleteLessonTarget}
        onClose={() => setDeleteLessonTarget(null)}
        onConfirm={confirmDeleteLesson}
        title="Delete Lesson"
        message={
          <p>Delete <span className="font-bold t-text">"{deleteLessonTarget?.lesson.title}"</span>? This cannot be undone.</p>
        }
        confirmLabel="Delete Lesson"
      />
    </div>
  );
};
