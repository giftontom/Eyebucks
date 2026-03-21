import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminApi, mockShowToast } = vi.hoisted(() => ({
  mockAdminApi: {
    getReviews: vi.fn(),
    deleteReview: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockAdminApi }));

vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({ showToast: mockShowToast }),
}));

vi.mock('../../../../pages/admin/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, onConfirm, title, confirmLabel = 'Confirm' }: any) =>
    open
      ? React.createElement('div', { role: 'dialog', 'aria-label': title },
          React.createElement('button', { onClick: onConfirm }, confirmLabel)
        )
      : null,
}));

vi.mock('../../../../pages/admin/components/DataTable', () => ({
  DataTable: ({ data, loading, emptyMessage, loadingMessage, columns }: any) => {
    if (loading) return React.createElement('div', null, loadingMessage || 'Loading...');
    if (!data || data.length === 0) return React.createElement('div', null, emptyMessage);
    return React.createElement(
      'table', null,
      React.createElement('tbody', null,
        data.map((row: any) =>
          React.createElement('tr', { key: row.id },
            columns.map((col: any) =>
              React.createElement('td', { key: col.key }, col.render ? col.render(row) : row[col.key])
            )
          )
        )
      )
    );
  },
}));

vi.mock('../../../../pages/admin/hooks/useDebounce', () => ({
  useDebounce: (v: any) => v,
}));

vi.mock('../../../../pages/admin/hooks/usePagination', () => ({
  usePagination: () => ({
    pagination: { page: 1, limit: 20, total: 0 },
    setPage: vi.fn(),
    setTotal: vi.fn(),
  }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { ReviewsPage } from '../../../../pages/admin/ReviewsPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockReview = {
  id: 'rev1',
  userId: 'u1',
  courseId: 'c1',
  rating: 4,
  comment: 'Great course!',
  userName: 'Test User',
  userEmail: 'test@example.com',
  courseTitle: 'React Fundamentals',
  createdAt: '2026-03-01T00:00:00Z',
  helpful: 2,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminApi.getReviews.mockResolvedValue({ reviews: [mockReview], total: 1 });
  mockAdminApi.deleteReview.mockResolvedValue({ success: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReviewsPage', () => {
  it('renders review rows after loading', async () => {
    render(<ReviewsPage />);
    await waitFor(() => expect(screen.getByText('React Fundamentals')).toBeInTheDocument());
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Great course!')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<ReviewsPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows "No reviews found" when list is empty', async () => {
    mockAdminApi.getReviews.mockResolvedValue({ reviews: [], total: 0 });
    render(<ReviewsPage />);
    await waitFor(() => expect(screen.getByText('No reviews found')).toBeInTheDocument());
  });

  it('shows error toast when getReviews fails', async () => {
    mockAdminApi.getReviews.mockRejectedValue(new Error('Fetch failed'));
    render(<ReviewsPage />);
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Failed to load reviews', 'error'));
  });

  it('opens delete confirm dialog when Delete button clicked', async () => {
    render(<ReviewsPage />);
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('dialog', { name: /delete review/i })).toBeInTheDocument();
  });

  it('calls deleteReview and shows success toast on confirm', async () => {
    render(<ReviewsPage />);
    await waitFor(() => screen.getByText('React Fundamentals'));
    const btns = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(btns[0]); // open dialog
    // ConfirmDialog now visible — click its Delete button (last one)
    const btnsAfter = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(btnsAfter[btnsAfter.length - 1]);
    await waitFor(() => expect(mockAdminApi.deleteReview).toHaveBeenCalledWith('rev1'));
    expect(mockShowToast).toHaveBeenCalledWith('Review deleted', 'success');
  });

  it('shows error toast when deleteReview fails', async () => {
    mockAdminApi.deleteReview.mockRejectedValue(new Error('Delete failed'));
    render(<ReviewsPage />);
    await waitFor(() => screen.getByText('React Fundamentals'));
    const btns = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(btns[0]); // open dialog
    const btnsAfter = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(btnsAfter[btnsAfter.length - 1]);
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Failed to delete review', 'error'));
  });
});
