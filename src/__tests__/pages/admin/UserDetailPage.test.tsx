import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminApi, mockShowToast } = vi.hoisted(() => ({
  mockAdminApi: {
    getUserDetails: vi.fn(),
    revokeEnrollment: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockAdminApi }));

vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({ showToast: mockShowToast }),
}));

vi.mock('../../../../pages/admin/components/AdminModal', () => ({
  AdminModal: ({ open, children, title }: any) =>
    open ? React.createElement('div', { role: 'dialog', 'aria-label': title }, children) : null,
}));

vi.mock('../../../../pages/admin/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, onConfirm, title, confirmLabel = 'Confirm' }: any) =>
    open
      ? React.createElement('div', { role: 'dialog', 'aria-label': title },
          React.createElement('button', { onClick: onConfirm }, confirmLabel)
        )
      : null,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ userId: 'u1' }),
  Link: ({ children, to }: any) => React.createElement('a', { href: to }, children),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { UserDetailPage } from '../../../../pages/admin/UserDetailPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockEnrollment = {
  id: 'enroll-1',
  userId: 'u1',
  courseId: 'c1',
  status: 'ACTIVE',
  createdAt: '2026-01-15T00:00:00Z',
  courses: { title: 'React Fundamentals' },
};

const mockUserDetail = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@test.com',
  role: 'USER',
  avatar: '',
  phone_e164: '+919876543210',
  created_at: '2026-01-01T00:00:00Z',
  enrollments: [mockEnrollment],
};

function renderPage() {
  return render(<UserDetailPage />);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminApi.getUserDetails.mockResolvedValue({ user: mockUserDetail });
  mockAdminApi.revokeEnrollment.mockResolvedValue({ success: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserDetailPage', () => {

  it('displays user name and email after loading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  });

  it('shows loading text while fetching user', () => {
    mockAdminApi.getUserDetails.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(screen.getByText(/loading user details/i)).toBeInTheDocument();
  });

  it('shows error toast when getUserDetails fails', async () => {
    mockAdminApi.getUserDetails.mockRejectedValue(new Error('Not found'));
    renderPage();
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Not found', 'error'));
  });

  it('displays enrollment list with course title', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('React Fundamentals')).toBeInTheDocument());
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows Enrollments count badge', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/Enrollments \(1\)/i)).toBeInTheDocument());
  });

  it('opens revoke confirm dialog when Revoke is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
    expect(screen.getByRole('dialog', { name: /revoke enrollment/i })).toBeInTheDocument();
  });

  it('calls revokeEnrollment and shows success toast on confirm', async () => {
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
    // ConfirmDialog confirm button
    fireEvent.click(screen.getAllByRole('button', { name: /revoke/i }).slice(-1)[0]);
    await waitFor(() => expect(mockAdminApi.revokeEnrollment).toHaveBeenCalledWith('enroll-1'));
    expect(mockShowToast).toHaveBeenCalledWith('Enrollment revoked', 'success');
  });

  it('shows error toast when revokeEnrollment fails', async () => {
    mockAdminApi.revokeEnrollment.mockRejectedValue(new Error('Revoke failed'));
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /revoke/i }).slice(-1)[0]);
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Revoke failed', 'error'));
  });

  it('shows empty enrollments message when user has no enrollments', async () => {
    mockAdminApi.getUserDetails.mockResolvedValue({
      user: { ...mockUserDetail, enrollments: [] },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Enrollments \(0\)/i)).toBeInTheDocument());
    expect(screen.queryByText('React Fundamentals')).not.toBeInTheDocument();
  });
});
