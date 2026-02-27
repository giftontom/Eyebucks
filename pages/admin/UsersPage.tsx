import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';
import { useAdmin } from './AdminContext';
import { useDebounce } from './hooks/useDebounce';
import { usePagination } from './hooks/usePagination';
import { DataTable } from './components/DataTable';
import { StatusBadge } from './components/StatusBadge';
import { AdminModal } from './components/AdminModal';
import type { AdminUser } from '../../types';

export const UsersPage: React.FC = () => {
  const { showToast, courses, coursesLoaded } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const debouncedSearch = useDebounce(search);
  const { pagination, setPage, setTotal } = usePagination(20);
  const [operationLoading, setOperationLoading] = useState(false);

  // Manual enroll modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollUser, setEnrollUser] = useState<AdminUser | null>(null);
  const [enrollCourseId, setEnrollCourseId] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        role: roleFilter || undefined,
      });
      setUsers(res.users);
      setTotal(res.pagination.total);
    } catch (err: any) {
      logger.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [debouncedSearch, pagination.page, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: 'USER' | 'ADMIN') => {
    setOperationLoading(true);
    try {
      await adminApi.updateUser(userId, { role: newRole });
      showToast(`Role updated to ${newRole}`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleStatusToggle = async (userId: string, currentActive: boolean) => {
    setOperationLoading(true);
    try {
      await adminApi.updateUser(userId, { isActive: !currentActive });
      showToast(`User ${!currentActive ? 'activated' : 'deactivated'}`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!enrollUser || !enrollCourseId) {
      showToast('Please select a course', 'error');
      return;
    }
    try {
      const res = await adminApi.manualEnrollUser(enrollUser.id, enrollCourseId);
      showToast(res.message || 'Enrollment successful!', 'success');
      setShowEnrollModal(false);
      setEnrollCourseId('');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to enroll user', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-bold text-slate-900">User Manager</h3>
          <div className="flex items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Roles</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-slate-900 focus:ring-1 focus:ring-brand-500 outline-none text-sm w-64"
              />
            </div>
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: 'identity',
              label: 'User Identity',
              className: 'pl-6',
              render: (u: AdminUser) => (
                <div className="flex items-center gap-3">
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {u.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <button
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                      className="font-medium text-slate-900 hover:text-brand-600 hover:underline"
                    >
                      {u.name}
                    </button>
                    <div className="text-slate-500 text-xs">{u.email}</div>
                  </div>
                </div>
              ),
            },
            {
              key: 'phone',
              label: 'Phone (E.164)',
              render: (u: AdminUser) => u.phoneVerified ? (
                <span className="text-slate-700">{u.phoneE164}</span>
              ) : (
                <span className="text-slate-400 italic">Not Verified</span>
              ),
            },
            {
              key: 'role',
              label: 'Role',
              render: (u: AdminUser) => (
                <select
                  value={u.role}
                  disabled={operationLoading}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as 'USER' | 'ADMIN')}
                  className={`px-2 py-1 rounded text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                    u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (u: AdminUser) => (
                <button
                  disabled={operationLoading}
                  onClick={() => handleStatusToggle(u.id, u.isActive)}
                  className={`px-2 py-1 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed ${
                    u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {operationLoading ? '...' : (u.isActive ? 'Active' : 'Inactive')}
                </button>
              ),
            },
            { key: 'enrollments', label: 'Enrollments', render: (u: AdminUser) => <span className="text-slate-500">{u.enrollmentCount || 0}</span> },
            {
              key: 'actions',
              label: 'Action',
              className: 'text-right pr-6',
              render: (u: AdminUser) => (
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => { setEnrollUser(u); setEnrollCourseId(''); setShowEnrollModal(true); }}
                    className="text-brand-600 hover:underline text-xs"
                  >
                    Enroll
                  </button>
                </div>
              ),
            },
          ]}
          data={users}
          loading={loading}
          emptyMessage="No users found"
          loadingMessage="Loading users..."
          rowKey={(u) => u.id}
          pagination={pagination}
          onPageChange={setPage}
        />
      </div>

      {/* Manual Enroll Modal */}
      <AdminModal
        open={showEnrollModal && !!enrollUser}
        onClose={() => { setShowEnrollModal(false); setEnrollCourseId(''); }}
        title={`Enroll ${enrollUser?.name || ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-500 mb-2">Select Course</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
              value={enrollCourseId}
              onChange={(e) => setEnrollCourseId(e.target.value)}
            >
              <option value="">-- Select a course --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title} (₹{(c.price / 100).toLocaleString()})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setShowEnrollModal(false); setEnrollCourseId(''); }}
            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleEnroll}
            disabled={!enrollCourseId}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Enroll
          </button>
        </div>
      </AdminModal>
    </div>
  );
};
