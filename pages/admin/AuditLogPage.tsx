import { ClipboardList, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { supabase } from '../../services/supabase';

// audit_logs is added by migration 021 — not yet in generated types, so we cast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const auditLogsTable = () => (supabase as any).from('audit_logs');

interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const PAGE_SIZE = 25;

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500/20 text-green-400 border-green-500/30',
  update: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delete: 'bg-red-500/20 text-red-400 border-red-500/30',
  publish: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  refund: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  revoke: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

function getActionColor(action: string): string {
  const prefix = action.split('.')[1] || action.split('.')[0];
  return ACTION_COLORS[prefix] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const { data, error, count } = await auditLogsTable()
        .select('*, users:admin_id(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {throw error;}

      setTotal(count || 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLogs((data || []).map((r: any) => ({
        id: r.id,
        adminId: r.admin_id,
        adminName: r.users?.name || r.admin_id,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        oldValue: r.old_value,
        newValue: r.new_value,
        metadata: r.metadata || {},
        createdAt: r.created_at,
      })));
    } catch (err) {
      console.error('[AuditLog] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold t-text">Audit Log</h1>
            <p className="text-sm t-text-2 mt-0.5">{total.toLocaleString()} events recorded</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 t-card t-border border rounded-lg text-sm t-text hover:bg-[var(--surface-hover)] transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 t-text-2">
          <ClipboardList size={40} className="mx-auto mb-4 opacity-30" />
          <p>No audit events recorded yet.</p>
        </div>
      ) : (
        <>
          <div className="t-card t-border border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="t-bg-alt border-b t-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold t-text-2 uppercase tracking-wider">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold t-text-2 uppercase tracking-wider">Admin</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold t-text-2 uppercase tracking-wider">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold t-text-2 uppercase tracking-wider">Entity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold t-text-2 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y t-border">
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr
                        className="hover:t-bg-alt transition cursor-pointer"
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-3 t-text-2 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-4 py-3 t-text font-medium">{log.adminName}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 t-text-2">
                          <span className="font-medium t-text">{log.entityType}</span>
                          {log.entityId && (
                            <span className="ml-1 text-xs opacity-60 font-mono">{log.entityId.slice(0, 8)}…</span>
                          )}
                        </td>
                        <td className="px-4 py-3 t-text-2 text-xs max-w-xs truncate">
                          {(log.metadata as { reason?: string })?.reason || '—'}
                        </td>
                      </tr>
                      {expandedId === log.id && (log.oldValue || log.newValue) && (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 t-bg-alt">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              {log.oldValue && (
                                <div>
                                  <p className="font-semibold t-text-2 mb-1">Before</p>
                                  <pre className="t-bg t-border border rounded p-2 overflow-auto max-h-40 t-text font-mono">
                                    {JSON.stringify(log.oldValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newValue && (
                                <div>
                                  <p className="font-semibold t-text-2 mb-1">After</p>
                                  <pre className="t-bg t-border border rounded p-2 overflow-auto max-h-40 t-text font-mono">
                                    {JSON.stringify(log.newValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm t-text-2">
                Page {page} of {totalPages} ({total.toLocaleString()} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 t-card t-border border rounded-lg text-sm t-text disabled:opacity-40 hover:bg-[var(--surface-hover)] transition"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 t-card t-border border rounded-lg text-sm t-text disabled:opacity-40 hover:bg-[var(--surface-hover)] transition"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
