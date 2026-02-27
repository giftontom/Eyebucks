import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { adminApi } from '../../services/api/admin.api';
import { useAdmin } from './AdminContext';
import { DataTable } from './components/DataTable';
import { StatusBadge } from './components/StatusBadge';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AdminModal } from './components/AdminModal';
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
    showArchived ? !!(c as any).deleted_at : !(c as any).deleted_at
  );

  // Sort
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: any, bVal: any;
    switch (sortColumn) {
      case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
      case 'price': aVal = a.price; bVal = b.price; break;
      case 'enrolled': aVal = a.enrollmentCount || 0; bVal = b.enrollmentCount || 0; break;
      case 'status': aVal = a.status; bVal = b.status; break;
      default: return 0;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
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

  const handlePublishToggle = async (course: AdminCourse) => {
    const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const action = newStatus === 'PUBLISHED' ? 'publish' : 'unpublish';
    if (!confirm(`Are you sure you want to ${action} "${course.title}"?`)) return;

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
    if (!deleteTarget) return;
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

  const handleRestore = async (course: AdminCourse) => {
    if (!confirm(`Restore "${course.title}"?`)) return;
    setOperationLoading(true);
    try {
      await adminApi.restoreCourse(course.id);
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-slate-900">Course Manager</h3>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                showArchived ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {showArchived ? <Eye size={14} /> : <EyeOff size={14} />}
              {showArchived ? 'Showing Archived' : 'Show Archived'}
            </button>
          </div>
          <button
            onClick={() => navigate('/admin/courses/new')}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm"
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
                  <span className="font-medium text-slate-900">{c.title}</span>
                  <StatusBadge status={c.type} />
                  {(c as any).deleted_at && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">Archived</span>}
                </div>
              ),
            },
            { key: 'status', label: 'Status', sortable: true, render: (c: AdminCourse) => <StatusBadge status={c.status} className="px-2 py-1 rounded-full" /> },
            { key: 'price', label: 'Price', sortable: true, render: (c: AdminCourse) => <span className="text-slate-700">₹{(c.price / 100).toLocaleString()}</span> },
            { key: 'enrolled', label: 'Enrolled', sortable: true, render: (c: AdminCourse) => <span className="text-slate-500">{c.enrollmentCount || 0}</span> },
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
                      c.status === 'PUBLISHED' ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'
                    }`}
                  >
                    {c.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => openAnalytics(c)} className="text-blue-600 hover:text-blue-700 font-medium text-sm">Stats</button>
                  <button onClick={() => navigate(`/admin/courses/${c.id}`)} className="text-brand-600 hover:text-brand-700 font-medium text-sm">Edit</button>
                  {(c as any).deleted_at ? (
                    <button onClick={() => handleRestore(c)} className="text-green-600 hover:text-green-700 font-medium text-sm">Restore</button>
                  ) : (
                    <button onClick={() => setDeleteTarget({ id: c.id, title: c.title })} className="text-red-600 hover:text-red-700 text-sm">Archive</button>
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
          rowClassName={(c) => (c as any).deleted_at ? 'opacity-60' : ''}
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
          <p>Are you sure you want to archive <span className="font-bold text-slate-900">"{deleteTarget?.title}"</span>?</p>
        }
        warning="The course will be hidden from students but can be restored later from the archived filter."
        confirmLabel="Archive Course"
      />

      {/* Course Analytics Modal */}
      <AdminModal
        open={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title=""
        maxWidth="max-w-lg"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" />
            Course Analytics
          </h3>
          <button onClick={() => setShowAnalytics(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-slate-500 mb-6">{analyticsCourseTitle}</p>
        {!analyticsData ? (
          <div className="flex items-center justify-center py-12 text-slate-400">Loading analytics...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{analyticsData.totalEnrollments}</p>
              <p className="text-xs text-blue-600 font-medium mt-1">Total Enrollments</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{analyticsData.completionRate.toFixed(1)}%</p>
              <p className="text-xs text-green-600 font-medium mt-1">Completion Rate</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">{analyticsData.avgWatchTimeMinutes.toFixed(0)} min</p>
              <p className="text-xs text-purple-600 font-medium mt-1">Avg Watch Time</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">₹{(analyticsData.revenueTotal / 100).toLocaleString('en-IN')}</p>
              <p className="text-xs text-yellow-600 font-medium mt-1">Total Revenue</p>
            </div>
            <div className="col-span-2 bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-700">{analyticsData.activeStudents30d}</p>
              <p className="text-xs text-slate-600 font-medium mt-1">Active Students (Last 30 Days)</p>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};
