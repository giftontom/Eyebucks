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
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
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

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="t-text-2">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
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
                className={`hover:bg-black/5 dark:hover:bg-white/5 transition ${isSelected ? 'bg-brand-500/10' : ''} ${rowClassName?.(row) || ''}`}
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

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-6 py-4 border-t t-border">
          <p className="text-sm t-text-2">
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
