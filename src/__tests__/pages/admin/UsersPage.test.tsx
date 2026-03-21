import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminApi, mockShowToast } = vi.hoisted(() => ({
  mockAdminApi: {
    getUsers: vi.fn(),
    updateUser: vi.fn(),
    manualEnrollUser: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockAdminApi }));

vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({
    showToast: mockShowToast,
    courses: [{ id: 'c1', title: 'React Fundamentals' }],
    coursesLoaded: true,
  }),
}));

vi.mock('../../../../pages/admin/components/AdminModal', () => ({
  AdminModal: ({ open, children, title }: any) =>
    open ? React.createElement('div', { role: 'dialog', 'aria-label': title }, children) : null,
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

vi.mock('../../../../pages/admin/components/StatusBadge', () => ({
  StatusBadge: ({ status }: any) => React.createElement('span', null, status),
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

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { UsersPage } from '../../../../pages/admin/UsersPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@test.com',
  role: 'USER',
  is_active: true,
  phone_e164: '+919876543210',
  created_at: '2026-01-01T00:00:00Z',
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminApi.getUsers.mockResolvedValue({
    users: [mockUser],
    pagination: { total: 1, page: 1, limit: 20 },
  });
  mockAdminApi.updateUser.mockResolvedValue({ success: true });
  mockAdminApi.manualEnrollUser.mockResolvedValue({ message: 'Enrollment successful!' });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersPage', () => {
  it('renders user names in table after loading', async () => {
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<UsersPage />);
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('shows "No users found" when list is empty', async () => {
    mockAdminApi.getUsers.mockResolvedValue({ users: [], pagination: { total: 0, page: 1, limit: 20 } });
    render(<UsersPage />);
    await waitFor(() => expect(screen.getByText('No users found')).toBeInTheDocument());
  });

  it('opens manual enroll modal when Enroll button clicked', async () => {
    render(<UsersPage />);
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /enroll/i }));
    expect(screen.getByRole('dialog', { name: /enroll/i })).toBeInTheDocument();
  });

  it('Confirm Enroll button is disabled when no course selected', async () => {
    render(<UsersPage />);
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /enroll/i }));
    await waitFor(() => screen.getByRole('dialog'));
    // Button is disabled until a course is selected
    expect(screen.getByRole('button', { name: /confirm enroll/i })).toBeDisabled();
  });

  it('calls manualEnrollUser and shows success toast after enrolling', async () => {
    render(<UsersPage />);
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /enroll/i }));
    await waitFor(() => screen.getByRole('dialog'));
    // Select a course — the combobox inside the modal (not the role filter)
    const selects = screen.getAllByRole('combobox');
    const courseSelect = selects[selects.length - 1];
    fireEvent.change(courseSelect, { target: { value: 'c1' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm enroll/i }));
    await waitFor(() => expect(mockAdminApi.manualEnrollUser).toHaveBeenCalledWith('u1', 'c1'));
    expect(mockShowToast).toHaveBeenCalledWith('Enrollment successful!', 'success');
  });
});
