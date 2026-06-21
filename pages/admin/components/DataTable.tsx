import { ChevronLeft, ChevronRight, AlertTriangle, Inbox } from 'lucide-react';
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
  /** When true, shows an error state with an optional Retry button instead of the empty message. */
  error?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  loadingMessage?: string;
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  error = false,
  errorMessage = 'Failed to load',
  onRetry,
  emptyMessage = 'No data found',
  loadingMessage = 'Loading...',
  rowKey,
  rowClassName,
  pagination,
  onPageChange,
  sortColumn,
  sortDirection,
  onSort,
  selectable = false,
  selectedIds,
  onSelectionChange,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every(row => selectedIds?.has(rowKey(row)));

  const toggleAll = () => {
    if (!onSelectionChange) { return; }
    if (allSelected) {
      const next = new Set(selectedIds);
      data.forEach(row => next.delete(rowKey(row)));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      data.forEach(row => next.add(rowKey(row)));
      onSelectionChange(next);
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) { return; }
    const next = new Set(selectedIds);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    onSelectionChange(next);
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="t-text-2">{loadingMessage}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <AlertTriangle size={32} className="mb-3" style={{ color: 'var(--status-danger-text)' }} />
        <p className="t-text font-medium mb-1">{errorMessage}</p>
        <p className="t-text-2 text-sm mb-4">Something went wrong loading this data.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <Inbox size={32} className="mb-3 t-text-3" />
        <p className="t-text-2">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="t-bg-alt t-text-2 text-xs uppercase tracking-wider font-semibold">
            <tr>
              {selectable && (
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded t-border text-brand-600 focus:ring-brand-500"
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-4 ${col.className || ''} ${col.sortable ? 'cursor-pointer select-none hover:t-text' : ''}`}
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
          <tbody className="divide-y t-divide text-sm">
            {data.map((row) => {
              const id = rowKey(row);
              const isSelected = selectedIds?.has(id) ?? false;
              return (
              <tr
                key={id}
                className={`hover:bg-[var(--surface-hover)] transition ${isSelected ? 'bg-brand-500/10' : ''} ${rowClassName?.(row) || ''}`}
              >
                {selectable && (
                  <td className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                      className="w-4 h-4 rounded t-border text-brand-600 focus:ring-brand-500"
                      aria-label="Select row"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={`p-4 ${col.className || ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card view */}
      <div className="md:hidden space-y-3">
        {data.map((row) => {
          const id = rowKey(row);
          const isSelected = selectedIds?.has(id) ?? false;
          return (
            <div
              key={id}
              className={`t-card rounded-xl p-4 space-y-2 transition ${isSelected ? 'ring-2 ring-brand-500' : ''} ${rowClassName?.(row) || ''}`}
            >
              {selectable && (
                <div className="flex items-center gap-2 pb-2 border-b t-border">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRow(id)}
                    className="w-4 h-4 rounded t-border text-brand-600 focus:ring-brand-500"
                    aria-label="Select row"
                  />
                  <span className="text-xs t-text-2">Select</span>
                </div>
              )}
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium t-text-2 uppercase tracking-wider min-w-[80px]">{col.label}</span>
                  <span className="text-sm t-text text-right">{col.render(row)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t t-border">
          <p className="text-sm t-text-2 text-center sm:text-left">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg t-border border hover:t-card disabled:opacity-30 disabled:cursor-not-allowed t-text"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm t-text font-medium px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg t-border border hover:t-card disabled:opacity-30 disabled:cursor-not-allowed t-text"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
