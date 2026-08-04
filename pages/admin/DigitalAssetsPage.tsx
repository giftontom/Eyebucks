import { Plus, Eye, EyeOff, Download } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { digitalAssetsApi } from '../../services/api/digitalAssets.api';
import { formatPrice } from '../../utils/format';

import { useAdmin } from './AdminContext';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DataTable } from './components/DataTable';
import { StatusBadge } from './components/StatusBadge';
import { useAdminData } from './hooks/useAdminData';

import type { AdminDigitalAsset } from '../../types';

export const DigitalAssetsPage: React.FC = () => {
  const { showToast } = useAdmin();
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [publishTarget, setPublishTarget] = useState<{ asset: AdminDigitalAsset; action: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AdminDigitalAsset | null>(null);

  const fetchAssets = useCallback(async () => digitalAssetsApi.getAdminAssets(), []);
  const { data: assets, loading, refetch } = useAdminData<AdminDigitalAsset[]>({ fetchFn: fetchAssets });

  const filtered = (assets || []).filter(a => (showArchived ? !!a.deletedAt : !a.deletedAt));

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) { return 0; }
    let aVal: string | number = '';
    let bVal: string | number = '';
    switch (sortColumn) {
      case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
      case 'price': aVal = a.price; bVal = b.price; break;
      case 'downloads': aVal = a.downloadCount || 0; bVal = b.downloadCount || 0; break;
      case 'status': aVal = a.status; bVal = b.status; break;
      default: return 0;
    }
    if (aVal < bVal) { return sortDirection === 'asc' ? -1 : 1; }
    if (aVal > bVal) { return sortDirection === 'asc' ? 1 : -1; }
    return 0;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handlePublishToggle = (asset: AdminDigitalAsset) => {
    const action = asset.status === 'PUBLISHED' ? 'unpublish' : 'publish';
    setPublishTarget({ asset, action });
  };

  const confirmPublishToggle = async () => {
    if (!publishTarget) { return; }
    const { asset, action } = publishTarget;
    const newStatus = asset.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setPublishTarget(null);
    setOperationLoading(true);
    try {
      await digitalAssetsApi.publishAsset(asset.id, newStatus);
      showToast(`Asset ${action}ed successfully!`, 'success');
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to ${action} asset`, 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!deleteTarget) { return; }
    try {
      await digitalAssetsApi.deleteAsset(deleteTarget.id);
      showToast('Asset archived!', 'success');
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to archive asset', 'error');
    }
  };

  const confirmRestore = async () => {
    if (!restoreTarget) { return; }
    setRestoreTarget(null);
    setOperationLoading(true);
    try {
      await digitalAssetsApi.restoreAsset(restoreTarget.id);
      showToast('Asset restored!', 'success');
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to restore', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="t-card t-border border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b t-border flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold t-text">Digital Assets</h3>
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
            onClick={() => navigate('/admin/digital-assets/new')}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm"
          >
            <Plus size={16} /> New Asset
          </button>
        </div>

        <DataTable
          columns={[
            {
              key: 'title',
              label: 'Asset',
              className: 'pl-6',
              sortable: true,
              render: (a: AdminDigitalAsset) => (
                <div className="flex items-center gap-2">
                  <span className="font-medium t-text">{a.title}</span>
                  <span className="px-2 py-0.5 t-bg-alt t-text-2 border t-border text-xs font-semibold rounded uppercase tracking-wide">{a.fileType}</span>
                  {a.deletedAt && <span className="px-2 py-0.5 t-status-danger border text-xs font-bold rounded">Archived</span>}
                </div>
              ),
            },
            { key: 'status', label: 'Status', sortable: true, render: (a: AdminDigitalAsset) => <StatusBadge status={a.status} className="px-2 py-1 rounded-full" /> },
            { key: 'price', label: 'Price', sortable: true, render: (a: AdminDigitalAsset) => <span className="t-text">{a.price === 0 ? 'Free' : formatPrice(a.price)}</span> },
            {
              key: 'downloads',
              label: 'Downloads',
              sortable: true,
              render: (a: AdminDigitalAsset) => (
                <span className="t-text-2 inline-flex items-center gap-1"><Download size={14} /> {a.downloadCount || 0}</span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              className: 'text-right pr-6',
              render: (a: AdminDigitalAsset) => (
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  <button
                    disabled={operationLoading}
                    onClick={() => handlePublishToggle(a)}
                    className="font-medium disabled:opacity-50 text-sm hover:opacity-70"
                    style={{ color: a.status === 'PUBLISHED' ? 'var(--status-warning-text)' : 'var(--status-success-text)' }}
                  >
                    {a.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => navigate(`/admin/digital-assets/${a.id}`)} className="text-brand-600 hover:text-brand-500 font-medium text-sm">Edit</button>
                  {a.deletedAt ? (
                    <button onClick={() => setRestoreTarget(a)} className="font-medium text-sm hover:opacity-70" style={{ color: 'var(--status-success-text)' }}>Restore</button>
                  ) : (
                    <button onClick={() => setDeleteTarget({ id: a.id, title: a.title })} className="text-sm hover:opacity-70" style={{ color: 'var(--status-danger-text)' }}>Archive</button>
                  )}
                </div>
              ),
            },
          ]}
          data={sorted}
          loading={loading}
          emptyMessage="No digital assets found"
          loadingMessage="Loading assets..."
          rowKey={(a) => a.id}
          rowClassName={(a) => (a.deletedAt ? 'opacity-60' : '')}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleArchive}
        title="Archive Asset"
        message={<p>Are you sure you want to archive <span className="font-bold t-text">{deleteTarget?.title}</span>?</p>}
        warning="The asset will be hidden from the shop but can be restored later from the archived filter."
        confirmLabel="Archive Asset"
      />

      <ConfirmDialog
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={confirmPublishToggle}
        title={`${publishTarget?.action === 'publish' ? 'Publish' : 'Unpublish'} Asset`}
        message={<p>Are you sure you want to {publishTarget?.action} <span className="font-bold t-text">{publishTarget?.asset.title}</span>?</p>}
        confirmLabel={publishTarget?.action === 'publish' ? 'Publish' : 'Unpublish'}
        confirmColor={publishTarget?.action === 'publish' ? 'bg-brand-600 hover:bg-brand-500' : 'bg-[var(--status-warning-bg)] hover:opacity-90 text-[var(--status-warning-text)] border border-[var(--status-warning-border)]'}
      />

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={confirmRestore}
        title="Restore Asset"
        message={<p>Restore <span className="font-bold t-text">{restoreTarget?.title}</span>?</p>}
        confirmLabel="Restore"
        confirmColor="bg-brand-600 hover:bg-brand-500"
      />
    </div>
  );
};
