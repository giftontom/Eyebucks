import { Plus, Eye, EyeOff, BarChart3 } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminApi } from '../../services/api/admin.api';

import { useAdmin } from './AdminContext';
import { AdminModal } from './components/AdminModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DataTable } from './components/DataTable';
import { StatusBadge } from './components/StatusBadge';
import { useAdminData } from './hooks/useAdminData';

import type { AdminCourse, CourseAnalytics } from '../../types';

export const CoursesPage: React.FC = () => {
  const { showToast, refreshCourses } = useAdmin();
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Publish/restore confirm
  const [publishTarget, setPublishTarget] = useState<{ course: AdminCourse; action: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AdminCourse | null>(null);

  // Analytics modal
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<CourseAnalytics | null>(null);
  const [analyticsCourseTitle, setAnalyticsCourseTitle] = useState('');

  const fetchCourses = useCallback(async () => {
    const res = await adminApi.getCourses();
    return res.courses as AdminCourse[];
  }, []);

  const { data: courses, loading, refetch } = useAdminData<AdminCourse[]>({ fetchFn: fetchCourses });

  const filteredCourses = (courses || []).filter(c =>
    showArchived ? !!c.deletedAt : !c.deletedAt
  );

  // Sort
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (!sortColumn) {return 0;}
    let aVal: any, bVal: any;
    switch (sortColumn) {
      case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
      case 'price': aVal = a.price; bVal = b.price; break;
      case 'enrolled': aVal = a.enrollmentCount || 0; bVal = b.enrollmentCount || 0; break;
      case 'status': aVal = a.status; bVal = b.status; break;
      default: return 0;
    }
    if (aVal < bVal) {return sortDirection === 'asc' ? -1 : 1;}
    if (aVal > bVal) {return sortDirection === 'asc' ? 1 : -1;}
    return 0;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handlePublishToggle = (course: AdminCourse) => {
    const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const action = newStatus === 'PUBLISHED' ? 'publish' : 'unpublish';
    setPublishTarget({ course, action });
  };

  const confirmPublishToggle = async () => {
    if (!publishTarget) {return;}
    const { course, action } = publishTarget;
    const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setPublishTarget(null);
    setOperationLoading(true);
    try {
      await adminApi.publishCourse(course.id, newStatus);
      showToast(`Course ${action}ed successfully!`, 'success');
      refetch();
      refreshCourses();
    } catch (err: any) {
      showToast(err.message || `Failed to ${action} course`, 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!deleteTarget) {return;}
    try {
      await adminApi.deleteCourse(deleteTarget.id);
      showToast('Course archived!', 'success');
      setDeleteTarget(null);
      refetch();
      refreshCourses();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive course', 'error');
    }
  };

  const handleRestore = (course: AdminCourse) => {
    setRestoreTarget(course);
  };

  const confirmRestore = async () => {
    if (!restoreTarget) {return;}
    setRestoreTarget(null);
    setOperationLoading(true);
    try {
      await adminApi.restoreCourse(restoreTarget.id);
      showToast('Course restored!', 'success');
      refetch();
      refreshCourses();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  const openAnalytics = async (course: AdminCourse) => {
    setAnalyticsCourseTitle(course.title);
    setAnalyticsData(null);
    setShowAnalytics(true);
    try {
      const res = await adminApi.getCourseAnalytics(course.id);
      setAnalyticsData(res.analytics);
    } catch (err: any) {
      showToast(err.message || 'Failed to load analytics', 'error');
      setShowAnalytics(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="t-card t-border border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b t-border flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold t-text">Course Manager</h3>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                showArchived ? 't-status-warning border' : 't-card t-border border t-text-2 hover:bg-[var(--surface-hover)]'
              }`}
            >
              {showArchived ? <Eye size={14} /> : <EyeOff size={14} />}
              {showArchived ? 'Showing Archived' : 'Show Archived'}
            </button>
          </div>
          <button
            onClick={() => navigate('/admin/courses/new')}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm"
          >
            <Plus size={16} /> New Course
          </button>
        </div>

        <DataTable
          columns={[
            {
              key: 'title',
              label: 'Course Title',
              className: 'pl-6',
              sortable: true,
              render: (c: AdminCourse) => (
                <div className="flex items-center gap-2">
                  <span className="font-medium t-text">{c.title}</span>
                  <StatusBadge status={c.type} />
                  {c.deletedAt && <span className="px-2 py-0.5 t-status-danger border text-xs font-bold rounded">Archived</span>}
                </div>
              ),
            },
            { key: 'status', label: 'Status', sortable: true, render: (c: AdminCourse) => <StatusBadge status={c.status} className="px-2 py-1 rounded-full" /> },
            { key: 'price', label: 'Price', sortable: true, render: (c: AdminCourse) => <span className="t-text">₹{(c.price / 100).toLocaleString()}</span> },
            { key: 'enrolled', label: 'Enrolled', sortable: true, render: (c: AdminCourse) => <span className="t-text-2">{c.enrollmentCount || 0}</span> },
            {
              key: 'actions',
              label: 'Actions',
              className: 'text-right pr-6',
              render: (c: AdminCourse) => (
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  <button
                    disabled={operationLoading}
                    onClick={() => handlePublishToggle(c)}
                    className={`font-medium disabled:opacity-50 text-sm ${
                      c.status === 'PUBLISHED'
                        ? 'hover:opacity-70'
                        : 'hover:opacity-70'
                    }`}
                    style={{ color: c.status === 'PUBLISHED' ? 'var(--status-warning-text)' : 'var(--status-success-text)' }}
                  >
                    {c.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => openAnalytics(c)} className="font-medium text-sm hover:opacity-70" style={{ color: 'var(--status-info-text)' }}>Stats</button>
                  <button onClick={() => navigate(`/admin/courses/${c.id}`)} className="text-brand-600 hover:text-brand-500 font-medium text-sm">Edit</button>
                  {c.deletedAt ? (
                    <button onClick={() => handleRestore(c)} className="font-medium text-sm hover:opacity-70" style={{ color: 'var(--status-success-text)' }}>Restore</button>
                  ) : (
                    <button onClick={() => setDeleteTarget({ id: c.id, title: c.title })} className="text-sm hover:opacity-70" style={{ color: 'var(--status-danger-text)' }}>Archive</button>
                  )}
                </div>
              ),
            },
          ]}
          data={sortedCourses}
          loading={loading}
          emptyMessage="No courses found"
          loadingMessage="Loading courses..."
          rowKey={(c) => c.id}
          rowClassName={(c) => c.deletedAt ? 'opacity-60' : ''}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </div>

      {/* Archive Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleArchive}
        title="Archive Course"
        message={
          <p>Are you sure you want to archive <span className="font-bold t-text">"{deleteTarget?.title}"</span>?</p>
        }
        warning="The course will be hidden from students but can be restored later from the archived filter."
        confirmLabel="Archive Course"
      />

      {/* Publish/Unpublish Confirm */}
      <ConfirmDialog
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={confirmPublishToggle}
        title={`${publishTarget?.action === 'publish' ? 'Publish' : 'Unpublish'} Course`}
        message={
          <p>Are you sure you want to {publishTarget?.action} <span className="font-bold t-text">"{publishTarget?.course.title}"</span>?</p>
        }
        confirmLabel={publishTarget?.action === 'publish' ? 'Publish' : 'Unpublish'}
        confirmColor={publishTarget?.action === 'publish' ? 'bg-brand-600 hover:bg-brand-500' : 'bg-[var(--status-warning-bg)] hover:opacity-90 text-[var(--status-warning-text)] border border-[var(--status-warning-border)]'}
      />

      {/* Restore Confirm */}
      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={confirmRestore}
        title="Restore Course"
        message={
          <p>Restore <span className="font-bold t-text">"{restoreTarget?.title}"</span>?</p>
        }
        confirmLabel="Restore"
        confirmColor="bg-brand-600 hover:bg-brand-500"
      />

      {/* Course Analytics Modal */}
      <AdminModal
        open={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title=""
        maxWidth="max-w-lg"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold t-text flex items-center gap-2">
            <BarChart3 size={20} style={{ color: 'var(--status-info-text)' }} />
            Course Analytics
          </h3>
          <button onClick={() => setShowAnalytics(false)} className="t-text-2 hover:t-text text-xl">&times;</button>
        </div>
        <p className="text-sm t-text-2 mb-6">{analyticsCourseTitle}</p>
        {!analyticsData ? (
          <div className="flex items-center justify-center py-12 t-text-3">Loading analytics...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="t-status-info border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{analyticsData.totalEnrollments}</p>
              <p className="text-xs font-medium mt-1">Total Enrollments</p>
            </div>
            <div className="t-status-success border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{analyticsData.completionRate.toFixed(1)}%</p>
              <p className="text-xs font-medium mt-1">Completion Rate</p>
            </div>
            <div className="bg-brand-600/10 border border-brand-600/20 text-brand-400 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{analyticsData.avgWatchTimeMinutes.toFixed(0)} min</p>
              <p className="text-xs font-medium mt-1">Avg Watch Time</p>
            </div>
            <div className="t-status-warning border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">₹{(analyticsData.revenueTotal / 100).toLocaleString('en-IN')}</p>
              <p className="text-xs font-medium mt-1">Total Revenue</p>
            </div>
            <div className="col-span-2 t-card t-border border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold t-text">{analyticsData.activeStudents30d}</p>
              <p className="text-xs t-text-2 font-medium mt-1">Active Students (Last 30 Days)</p>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};
