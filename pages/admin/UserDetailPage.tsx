import { ArrowLeft } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';

import { useAdmin } from './AdminContext';
import { ConfirmDialog } from './components/ConfirmDialog';
import { StatusBadge } from './components/StatusBadge';

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
    if (!userId) {return;}
    try {
      setLoading(true);
      const res = await adminApi.getUserDetails(userId);
      setUser(res.user);
    } catch (err: unknown) {
      logger.error('Failed to fetch user details:', err);
      showToast(err instanceof Error ? err.message : 'Failed to load user', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [userId]);

  const handleRevoke = async () => {
    if (!revokeTarget) {return;}
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
        <div className="t-text-3">Loading user details...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="t-text-3">User not found</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back link */}
      <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm t-text-2 hover:t-text transition">
        <ArrowLeft size={16} /> Back to Users
      </Link>

      {/* User profile card */}
      <div className="t-card t-border border rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full t-bg-alt t-border border flex items-center justify-center text-xl font-bold t-text-2">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold t-text">{user.name}</h2>
            <p className="t-text-2">{user.email}</p>
            <div className="flex items-center gap-3 mt-3">
              <StatusBadge status={user.role} />
              <StatusBadge status={user.is_active ? 'ACTIVE' : 'Inactive'} />
              {user.phone_verified && user.phone_e164 && (
                <span className="text-sm t-text-2">{user.phone_e164}</span>
              )}
            </div>
          </div>
          <div className="text-right text-sm t-text-2">
            <div>Joined: {new Date(user.created_at).toLocaleDateString('en-IN')}</div>
            {user.last_login_at && (
              <div>Last login: {new Date(user.last_login_at).toLocaleDateString('en-IN')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Enrollments */}
      <div className="t-card t-border border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b t-border">
          <h3 className="text-lg font-bold t-text">
            Enrollments ({user.enrollments?.length || 0})
          </h3>
        </div>

        {!user.enrollments || user.enrollments.length === 0 ? (
          <div className="flex items-center justify-center py-12 t-text-3">
            No enrollments found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="t-bg-alt t-text-2 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4 pl-6">Course</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Enrolled</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y t-divide text-sm">
                {user.enrollments.map(enrollment => (
                  <tr key={enrollment.id} className="hover:bg-[var(--surface-hover)] transition">
                    <td className="p-4 pl-6 font-medium t-text">
                      {enrollment.courses?.title || 'Unknown Course'}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={enrollment.courses?.type || 'MODULE'} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={enrollment.status} />
                    </td>
                    <td className="p-4 t-text">
                      {enrollment.amount > 0
                        ? `₹${(enrollment.amount / 100).toLocaleString('en-IN')}`
                        : 'Free'
                      }
                    </td>
                    <td className="p-4 t-text-2">
                      {new Date(enrollment.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4 text-right pr-6">
                      {enrollment.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setRevokeTarget({ id: enrollment.id, courseTitle: enrollment.courses?.title || 'this course' })}
                          className="font-medium text-sm hover:opacity-70"
                          style={{ color: 'var(--status-danger-text)' }}
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="t-text-3 italic text-sm">{enrollment.status}</span>
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
          <p>Are you sure you want to revoke enrollment for <span className="font-bold t-text">"{revokeTarget?.courseTitle}"</span>?</p>
        }
        warning="The student will lose access to this course immediately."
        confirmLabel="Revoke"
        loading={revoking}
      />
    </div>
  );
};
