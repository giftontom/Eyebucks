import { Search, Star, Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';

import { useAdmin } from './AdminContext';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DataTable } from './components/DataTable';
import { useDebounce } from './hooks/useDebounce';
import { usePagination } from './hooks/usePagination';

import type { AdminReview } from '../../services/api/admin.api';

export const ReviewsPage: React.FC = () => {
  const { showToast } = useAdmin();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { pagination, setPage, setTotal } = usePagination(20);

  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getReviews({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
      });
      setReviews(res.reviews);
      setTotal(res.total);
    } catch (err) {
      logger.error('[Admin Reviews] Fetch error:', err);
      showToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [pagination.page, debouncedSearch]);

  const handleDelete = async () => {
    if (!deleteTarget) {return;}
    try {
      await adminApi.deleteReview(deleteTarget.id);
      showToast('Review deleted', 'success');
      setDeleteTarget(null);
      fetchReviews();
    } catch (err) {
      logger.error('[Admin Reviews] Delete error:', err);
      showToast('Failed to delete review', 'error');
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={14} className={n <= rating ? 'fill-[var(--status-warning-text)] text-[var(--status-warning-text)]' : 't-text-3'} />
      ))}
    </div>
  );

  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (r: AdminReview) => (
        <div>
          <p className="font-medium t-text text-sm">{r.userName}</p>
          <p className="text-xs t-text-2">{r.userEmail}</p>
        </div>
      ),
    },
    {
      key: 'course',
      label: 'Course',
      render: (r: AdminReview) => (
        <span className="text-sm t-text">{r.courseTitle}</span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (r: AdminReview) => renderStars(r.rating),
    },
    {
      key: 'comment',
      label: 'Comment',
      render: (r: AdminReview) => (
        <p className="text-sm t-text-2 max-w-xs truncate" title={r.comment}>
          {r.comment}
        </p>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (r: AdminReview) => (
        <span className="text-xs t-text-2">
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r: AdminReview) => (
        <button
          onClick={() => setDeleteTarget(r)}
          className="p-1.5 t-status-danger border rounded-lg transition hover:opacity-80"
          title="Delete review"
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold t-text">Reviews</h1>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 t-text-3" />
        <input
          type="text"
          placeholder="Search by comment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 t-input-bg t-border border rounded-lg text-sm t-text outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Table */}
      <div className="t-card t-border border rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={reviews}
          loading={loading}
          emptyMessage="No reviews found"
          rowKey={(r) => r.id}
          pagination={pagination}
          onPageChange={setPage}
        />
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Review"
        message={deleteTarget ? `Delete review by ${deleteTarget.userName} on "${deleteTarget.courseTitle}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
};
