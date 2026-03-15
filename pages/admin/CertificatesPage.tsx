import { FileText } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';

import { useAdmin } from './AdminContext';
import { AdminModal } from './components/AdminModal';
import { DataTable } from './components/DataTable';
import { StatusBadge } from './components/StatusBadge';
import { usePagination } from './hooks/usePagination';

import type { AdminCertificate } from '../../types';

export const CertificatesPage: React.FC = () => {
  const { showToast, courses, users, refreshUsers, usersLoaded } = useAdmin();
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const { pagination, setPage, setTotal } = usePagination(20);

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // Revoke modal
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [certToRevoke, setCertToRevoke] = useState<{ id: string; studentName: string; courseTitle: string } | null>(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCertificates({ page: pagination.page, limit: pagination.limit });
      setCertificates(res.certificates);
      setTotal(res.pagination.total);
    } catch (err: any) {
      logger.error('Failed to fetch certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCertificates(); }, [pagination.page]);

  const handleIssue = async () => {
    if (!selectedUserId || !selectedCourseId) {
      showToast('Please select both user and course', 'error');
      return;
    }
    try {
      const res = await adminApi.issueCertificate(selectedUserId, selectedCourseId);
      showToast(res.message || 'Certificate issued!', 'success');
      setShowIssueModal(false);
      setSelectedUserId('');
      setSelectedCourseId('');
      fetchCertificates();
    } catch (err: any) {
      showToast(err.message || 'Failed to issue certificate', 'error');
    }
  };

  const handleRevoke = async () => {
    if (!certToRevoke) {return;}
    try {
      const res = await adminApi.revokeCertificate(certToRevoke.id, revokeReason);
      showToast(res.message || 'Certificate revoked!', 'success');
      setShowRevokeModal(false);
      setCertToRevoke(null);
      setRevokeReason('');
      fetchCertificates();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke certificate', 'error');
    }
  };

  const openIssueModal = async () => {
    if (!usersLoaded) {await refreshUsers();}
    setSelectedUserId('');
    setSelectedCourseId('');
    setShowIssueModal(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="t-card t-border border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b t-border flex justify-between items-center">
          <h3 className="text-xl font-bold t-text">Certificate Manager</h3>
          <button
            onClick={openIssueModal}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm"
          >
            <FileText size={16} /> Issue Manually
          </button>
        </div>

        <DataTable
          columns={[
            { key: 'number', label: 'Certificate Number', className: 'pl-6', render: (c: AdminCertificate) => <span className="font-mono t-text-3 text-xs">{c.certificateNumber}</span> },
            { key: 'student', label: 'Student', render: (c: AdminCertificate) => <span className="font-medium t-text">{c.studentName}</span> },
            { key: 'course', label: 'Course', render: (c: AdminCertificate) => <span className="t-text-2">{c.courseTitle}</span> },
            { key: 'date', label: 'Issue Date', render: (c: AdminCertificate) => <span className="t-text-2">{new Date(c.issueDate).toLocaleDateString('en-IN')}</span> },
            { key: 'status', label: 'Status', render: (c: AdminCertificate) => <StatusBadge status={c.status} /> },
            {
              key: 'action',
              label: 'Action',
              className: 'text-right pr-6',
              render: (c: AdminCertificate) => c.status === 'ACTIVE' ? (
                <button
                  onClick={() => { setCertToRevoke({ id: c.id, studentName: c.studentName, courseTitle: c.courseTitle }); setShowRevokeModal(true); }}
                  className="font-medium text-sm hover:opacity-70"
                  style={{ color: 'var(--status-danger-text)' }}
                >
                  Revoke
                </button>
              ) : (
                <span className="t-text-3 italic text-sm">Revoked</span>
              ),
            },
          ]}
          data={certificates}
          loading={loading}
          emptyMessage="No certificates found"
          loadingMessage="Loading certificates..."
          rowKey={(c) => c.id}
          pagination={pagination}
          onPageChange={setPage}
        />
      </div>

      {/* Issue Certificate Modal */}
      <AdminModal
        open={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title="Issue Certificate Manually"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">Select User *</label>
            <select
              className="w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">-- Select a user --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">Select Course *</label>
            <select
              className="w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">-- Select a course --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="t-status-warning border rounded-lg p-3 text-xs">
            This will issue a certificate without verifying course completion. Use responsibly.
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowIssueModal(false)}
            className="flex-1 t-card t-border border hover:bg-[var(--surface-hover)] t-text py-2 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleIssue}
            disabled={!selectedUserId || !selectedCourseId}
            className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Issue Certificate
          </button>
        </div>
      </AdminModal>

      {/* Revoke Certificate Modal */}
      <AdminModal
        open={showRevokeModal && !!certToRevoke}
        onClose={() => { setShowRevokeModal(false); setCertToRevoke(null); setRevokeReason(''); }}
        title="Revoke Certificate"
      >
        {certToRevoke && (
          <>
            <p className="t-text-2 mb-4">
              Revoking certificate for <span className="font-bold t-text">{certToRevoke.studentName}</span> - <span className="font-medium">{certToRevoke.courseTitle}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium t-text-2 mb-2">Reason for Revocation</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Explain why this certificate is being revoked..."
                rows={4}
                className="w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="t-status-danger border rounded-lg p-3 text-xs mb-4">
              This action cannot be undone. The certificate will be permanently revoked.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRevokeModal(false); setCertToRevoke(null); setRevokeReason(''); }}
                className="flex-1 t-card t-border border hover:bg-[var(--surface-hover)] t-text py-2 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                className="flex-1 t-status-danger border hover:opacity-80 py-2 rounded-lg font-medium transition"
              >
                Revoke Certificate
              </button>
            </div>
          </>
        )}
      </AdminModal>
    </div>
  );
};
