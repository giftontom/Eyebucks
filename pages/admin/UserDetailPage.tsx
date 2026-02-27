import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';
import { useAdmin } from './AdminContext';
import { StatusBadge } from './components/StatusBadge';
import { ConfirmDialog } from './components/ConfirmDialog';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  is_active: boolean;
  phone_e164: string | null;
  phone_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  enrollments: Array<{
    id: string;
    status: string;
    amount: number;
    created_at: string;
    courses: {
      id: string;
      title: string;
      slug: string;
      type: string;
    };
  }>;
}

export const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { showToast } = useAdmin();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Revoke enrollment
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; courseTitle: string } | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchUser = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await adminApi.getUserDetails(userId);
      setUser(res.user);
    } catch (err: any) {
      logger.error('Failed to fetch user details:', err);
      showToast(err.message || 'Failed to load user', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [userId]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await adminApi.revokeEnrollment(revokeTarget.id);
      showToast('Enrollment revoked', 'success');
      setRevokeTarget(null);
      fetchUser();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke enrollment', 'error');
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading user details...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">User not found</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back link */}
      <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to Users
      </Link>

      {/* User profile card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-600">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
            <p className="text-slate-500">{user.email}</p>
            <div className="flex items-center gap-3 mt-3">
              <StatusBadge status={user.role} />
              <StatusBadge status={user.is_active ? 'ACTIVE' : 'Inactive'} />
              {user.phone_verified && user.phone_e164 && (
                <span className="text-sm text-slate-600">{user.phone_e164}</span>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>Joined: {new Date(user.created_at).toLocaleDateString('en-IN')}</div>
            {user.last_login_at && (
              <div>Last login: {new Date(user.last_login_at).toLocaleDateString('en-IN')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Enrollments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            Enrollments ({user.enrollments?.length || 0})
          </h3>
        </div>

        {!user.enrollments || user.enrollments.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            No enrollments found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4 pl-6">Course</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Enrolled</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {user.enrollments.map(enrollment => (
                  <tr key={enrollment.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 pl-6 font-medium text-slate-900">
                      {enrollment.courses?.title || 'Unknown Course'}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={enrollment.courses?.type || 'MODULE'} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={enrollment.status} />
                    </td>
                    <td className="p-4 text-slate-700">
                      {enrollment.amount > 0
                        ? `₹${(enrollment.amount / 100).toLocaleString('en-IN')}`
                        : 'Free'
                      }
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(enrollment.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4 text-right pr-6">
                      {enrollment.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setRevokeTarget({ id: enrollment.id, courseTitle: enrollment.courses?.title || 'this course' })}
                          className="text-red-600 hover:text-red-700 font-medium text-sm"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-sm">{enrollment.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revoke Confirmation */}
      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke Enrollment"
        message={
          <p>Are you sure you want to revoke enrollment for <span className="font-bold text-slate-900">"{revokeTarget?.courseTitle}"</span>?</p>
        }
        warning="The student will lose access to this course immediately."
        confirmLabel="Revoke"
        loading={revoking}
      />
    </div>
  );
};
