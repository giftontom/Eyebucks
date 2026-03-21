import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminApi, mockShowToast } = vi.hoisted(() => ({
  mockAdminApi: {
    getPayments: vi.fn(),
    processRefund: vi.fn(),
    getStats: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockAdminApi }));

vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({ showToast: mockShowToast }),
}));

// Stub child components that pull in heavy deps
vi.mock('../../../../pages/admin/components/AdminModal', () => ({
  AdminModal: ({ open, children, title }: any) =>
    open ? React.createElement('div', { role: 'dialog', 'aria-label': title }, children) : null,
}));

vi.mock('../../../../pages/admin/components/DataTable', () => ({
  DataTable: ({ data, loading, emptyMessage, loadingMessage, columns }: any) => {
    if (loading) return React.createElement('div', null, loadingMessage || 'Loading...');
    if (!data || data.length === 0) return React.createElement('div', null, emptyMessage);
    return React.createElement(
      'table',
      null,
      React.createElement(
        'tbody',
        null,
        data.map((row: any) =>
          React.createElement(
            'tr',
            { key: row.id },
            columns.map((col: any) =>
              React.createElement('td', { key: col.key }, col.render ? col.render(row) : row[col.key])
            )
          )
        )
      )
    );
  },
}));

vi.mock('../../../../pages/admin/components/StatusBadge', () => ({
  StatusBadge: ({ status }: any) => React.createElement('span', { 'data-testid': 'status-badge' }, status),
}));

vi.mock('../../../../pages/admin/hooks/useDebounce', () => ({
  useDebounce: (v: string) => v,
}));

vi.mock('../../../../pages/admin/hooks/usePagination', () => ({
  usePagination: () => ({
    pagination: { page: 1, limit: 20, total: 0 },
    setPage: vi.fn(),
    setTotal: vi.fn(),
  }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { PaymentsPage } from '../../../../pages/admin/PaymentsPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockPayment = {
  id: 'pay-1',
  userId: 'u1',
  courseId: 'c1',
  courseTitle: 'React Fundamentals',
  userName: 'Alice',
  userEmail: 'alice@test.com',
  amount: 99900,
  status: 'captured' as const,
  razorpayOrderId: 'order-1',
  razorpayPaymentId: 'rzp-1',
  receiptNumber: 'REC-001',
  createdAt: '2026-01-15T00:00:00Z',
};

function renderPage() {
  return render(<PaymentsPage />);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminApi.getPayments.mockResolvedValue({ payments: [mockPayment], total: 1 });
  mockAdminApi.getStats.mockResolvedValue({ stats: { totalRevenue: 99900 } });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentsPage', () => {

  it('renders payment table with course title and amount', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('React Fundamentals').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/₹999/).length).toBeGreaterThan(0);
  });

  it('shows receipt number in table', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('REC-001')).toBeInTheDocument());
  });

  it('shows "No payments found" when list is empty', async () => {
    mockAdminApi.getPayments.mockResolvedValue({ payments: [], total: 0 });
    renderPage();
    await waitFor(() => expect(screen.getByText('No payments found')).toBeInTheDocument());
  });

  it('shows Refund button only for captured payments', async () => {
    mockAdminApi.getPayments.mockResolvedValue({
      payments: [
        mockPayment, // captured → Refund button
        { ...mockPayment, id: 'pay-2', status: 'refunded', receiptNumber: 'REC-002', courseTitle: 'Another Course' },
      ],
      total: 2,
    });
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    const refundBtns = screen.getAllByRole('button', { name: /refund/i });
    expect(refundBtns.length).toBe(1); // only for captured payment
  });

  it('opens refund modal with payment details when Refund is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: /refund/i }));
    expect(screen.getByRole('dialog', { name: /process refund/i })).toBeInTheDocument();
    expect(screen.getAllByText(/React Fundamentals/).length).toBeGreaterThan(0);
  });

  it('calls processRefund and shows success toast on confirm', async () => {
    mockAdminApi.processRefund.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: /refund/i }));
    await user.type(screen.getByPlaceholderText(/explain why/i), 'Student request');
    fireEvent.click(screen.getByRole('button', { name: /confirm refund/i }));
    await waitFor(() => expect(mockAdminApi.processRefund).toHaveBeenCalledWith('pay-1', 'Student request'));
    expect(mockShowToast).toHaveBeenCalledWith('Refund processed!', 'success');
  });

  it('shows error toast when processRefund fails', async () => {
    mockAdminApi.processRefund.mockRejectedValue(new Error('Refund failed'));
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: /refund/i }));
    await user.type(screen.getByPlaceholderText(/explain why/i), 'Student request');
    fireEvent.click(screen.getByRole('button', { name: /confirm refund/i }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Refund failed', 'error'));
  });

  it('shows error toast when reason is empty and Confirm Refund is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: /refund/i }));
    // Confirm Refund button is disabled when reason is empty — clicking it does nothing
    const confirmBtn = screen.getByRole('button', { name: /confirm refund/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('shows Export CSV button when payments exist', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument());
  });
});
