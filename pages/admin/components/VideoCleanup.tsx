import { Trash2, Search, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import React, { useState } from 'react';

import { adminApi } from '../../../services/api/admin.api';
import { logger } from '../../../utils/logger';

import { ConfirmDialog } from './ConfirmDialog';

interface VideoCleanupProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info', duration?: number) => void;
}

interface ScanResult {
  totalBunnyVideos: number;
  referencedInDb: number;
  orphanedCount: number;
  orphanedVideos: Array<{ guid: string; title: string; dateUploaded: string }>;
}

export const VideoCleanup: React.FC<VideoCleanupProps> = ({ showToast }) => {
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleScan = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      const result = await adminApi.cleanupOrphanedVideos(true);
      setScanResult(result);
      if (result.orphanedCount === 0) {
        showToast('No orphaned videos found', 'success');
      }
    } catch (err) {
      logger.error('[VideoCleanup] Scan failed:', err);
      showToast(err instanceof Error ? err.message : 'Scan failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    try {
      setDeleting(true);
      const result = await adminApi.cleanupOrphanedVideos(false);
      showToast(
        `Deleted ${result.deletedCount || 0} orphaned videos${result.failedCount ? `, ${result.failedCount} failed` : ''}`,
        result.failedCount ? 'error' : 'success'
      );
      setScanResult(null);
    } catch (err) {
      logger.error('[VideoCleanup] Delete failed:', err);
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="t-card t-border border p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-bold mb-4 t-text">Video Storage Cleanup</h3>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={handleScan}
          disabled={scanning || deleting}
          className="flex items-center gap-2 t-card t-border border hover:bg-[var(--surface-hover)] t-text px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {scanning ? 'Scanning...' : 'Scan for Orphaned Videos'}
        </button>

        {scanResult && scanResult.orphanedCount > 0 && (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="flex items-center gap-2 t-status-danger border px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 hover:opacity-80"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {deleting ? 'Deleting...' : `Delete ${scanResult.orphanedCount} Orphaned Videos`}
          </button>
        )}
      </div>

      {scanResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="t-bg-alt t-border border rounded-lg p-3 text-center">
              <div className="text-xl font-bold t-text">{scanResult.totalBunnyVideos}</div>
              <div className="t-text-2 text-xs">Total in Bunny</div>
            </div>
            <div className="t-bg-alt t-border border rounded-lg p-3 text-center">
              <div className="text-xl font-bold t-text">{scanResult.referencedInDb}</div>
              <div className="t-text-2 text-xs">Referenced in DB</div>
            </div>
            <div className={`rounded-lg p-3 text-center border ${scanResult.orphanedCount > 0 ? 't-status-danger' : 't-status-success'}`}>
              <div className="text-xl font-bold">
                {scanResult.orphanedCount}
              </div>
              <div className="text-xs">Orphaned</div>
            </div>
          </div>

          {scanResult.orphanedCount === 0 && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--status-success-text)' }}>
              <CheckCircle size={16} />
              <span>All Bunny videos are referenced in the database.</span>
            </div>
          )}

          {scanResult.orphanedVideos.length > 0 && (
            <div className="t-border border rounded-lg overflow-hidden">
              <div className="t-bg-alt px-3 py-2 text-xs font-bold t-text-2 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={12} /> Orphaned Videos
              </div>
              <div className="max-h-48 overflow-y-auto divide-y t-divide">
                {scanResult.orphanedVideos.map(v => (
                  <div key={v.guid} className="px-3 py-2 text-sm flex justify-between items-center">
                    <div>
                      <span className="t-text font-medium">{v.title}</span>
                      <span className="t-text-3 text-xs ml-2 font-mono">{v.guid.slice(0, 8)}...</span>
                    </div>
                    {v.dateUploaded && (
                      <span className="t-text-3 text-xs">
                        {new Date(v.dateUploaded).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Orphaned Videos"
        message={`This will permanently delete ${scanResult?.orphanedCount || 0} videos from Bunny.net that are not referenced by any module or course.`}
        warning="This action cannot be undone."
        confirmLabel="Delete Videos"
        loading={deleting}
      />
    </div>
  );
};
