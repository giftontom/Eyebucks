import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

import type { PaginationState } from '../hooks/usePagination';

interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  loadingMessage = 'Loading...',
  rowKey,
  rowClassName,
  pagination,
  onPageChange,
  sortColumn,
  sortDirection,
  onSort,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">{loadingMessage}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-4 ${col.className || ''} ${col.sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortColumn === col.key && (
                      <span className="text-brand-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                className={`hover:bg-slate-50 transition ${rowClassName?.(row) || ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`p-4 ${col.className || ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-slate-700 font-medium px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
