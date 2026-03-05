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
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold mb-4 text-slate-900">Video Storage Cleanup</h3>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={handleScan}
          disabled={scanning || deleting}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {scanning ? 'Scanning...' : 'Scan for Orphaned Videos'}
        </button>

        {scanResult && scanResult.orphanedCount > 0 && (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {deleting ? 'Deleting...' : `Delete ${scanResult.orphanedCount} Orphaned Videos`}
          </button>
        )}
      </div>

      {scanResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-slate-900">{scanResult.totalBunnyVideos}</div>
              <div className="text-slate-500 text-xs">Total in Bunny</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-slate-900">{scanResult.referencedInDb}</div>
              <div className="text-slate-500 text-xs">Referenced in DB</div>
            </div>
            <div className={`rounded-lg p-3 text-center ${scanResult.orphanedCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className={`text-xl font-bold ${scanResult.orphanedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {scanResult.orphanedCount}
              </div>
              <div className={`text-xs ${scanResult.orphanedCount > 0 ? 'text-red-500' : 'text-green-500'}`}>Orphaned</div>
            </div>
          </div>

          {scanResult.orphanedCount === 0 && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} />
              <span>All Bunny videos are referenced in the database.</span>
            </div>
          )}

          {scanResult.orphanedVideos.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={12} /> Orphaned Videos
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                {scanResult.orphanedVideos.map(v => (
                  <div key={v.guid} className="px-3 py-2 text-sm flex justify-between items-center">
                    <div>
                      <span className="text-slate-900 font-medium">{v.title}</span>
                      <span className="text-slate-400 text-xs ml-2 font-mono">{v.guid.slice(0, 8)}...</span>
                    </div>
                    {v.dateUploaded && (
                      <span className="text-slate-400 text-xs">
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
