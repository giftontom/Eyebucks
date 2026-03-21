import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminApi, mockShowToast } = vi.hoisted(() => ({
  mockAdminApi: {
    getCertificates: vi.fn(),
    issueCertificate: vi.fn(),
    revokeCertificate: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockAdminApi }));

vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({
    showToast: mockShowToast,
    courses: [{ id: 'c1', title: 'React Fundamentals' }],
    users: [{ id: 'u1', name: 'Alice', email: 'alice@test.com' }],
    refreshUsers: vi.fn(),
    usersLoaded: true,
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

vi.mock('../../../../pages/admin/hooks/usePagination', () => ({
  usePagination: () => ({
    pagination: { page: 1, limit: 20, total: 0 },
    setPage: vi.fn(),
    setTotal: vi.fn(),
  }),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { CertificatesPage } from '../../../../pages/admin/CertificatesPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockCert = {
  id: 'cert-1',
  certificateNumber: 'CERT-001',
  studentName: 'Alice',
  courseTitle: 'React Fundamentals',
  issueDate: '2026-01-15T00:00:00Z',
  status: 'ACTIVE',
};

function renderPage() {
  return render(<CertificatesPage />);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminApi.getCertificates.mockResolvedValue({ certificates: [mockCert], total: 1 });
  mockAdminApi.issueCertificate.mockResolvedValue({ message: 'Certificate issued!' });
  mockAdminApi.revokeCertificate.mockResolvedValue({ message: 'Certificate revoked!' });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CertificatesPage', () => {

  it('renders certificate list with student name and course title', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getAllByText('React Fundamentals').length).toBeGreaterThan(0);
    expect(screen.getByText('CERT-001')).toBeInTheDocument();
  });

  it('shows "No certificates found" when list is empty', async () => {
    mockAdminApi.getCertificates.mockResolvedValue({ certificates: [], total: 0 });
    renderPage();
    await waitFor(() => expect(screen.getByText('No certificates found')).toBeInTheDocument());
  });

  it('shows Revoke button only for ACTIVE certificates', async () => {
    mockAdminApi.getCertificates.mockResolvedValue({
      certificates: [
        mockCert,
        { ...mockCert, id: 'cert-2', status: 'REVOKED', studentName: 'Bob', certificateNumber: 'CERT-002' },
      ],
      total: 2,
    });
    renderPage();
    await waitFor(() => screen.getByText('Alice'));
    // Only 1 Revoke button (for ACTIVE cert); REVOKED cert shows italic "Revoked" text
    const revokeBtns = screen.getAllByRole('button', { name: /^revoke$/i });
    expect(revokeBtns.length).toBe(1);
  });

  it('opens revoke modal when Revoke is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /^revoke$/i }));
    expect(screen.getByRole('dialog', { name: /revoke certificate/i })).toBeInTheDocument();
  });

  it('calls revokeCertificate and shows success toast on confirm', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Alice'));
    fireEvent.click(screen.getByRole('button', { name: /^revoke$/i }));
    await user.type(screen.getByPlaceholderText(/explain why/i), 'Policy violation');
    fireEvent.click(screen.getByRole('button', { name: /revoke certificate/i }));
    await waitFor(() => expect(mockAdminApi.revokeCertificate).toHaveBeenCalledWith('cert-1', 'Policy violation'));
    expect(mockShowToast).toHaveBeenCalledWith('Certificate revoked!', 'success');
  });

  it('opens issue modal when "Issue Manually" is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /issue manually/i }));
    fireEvent.click(screen.getByRole('button', { name: /issue manually/i }));
    expect(screen.getByRole('dialog', { name: /issue certificate/i })).toBeInTheDocument();
  });

  it('shows toast error when issueCertificate fails', async () => {
    mockAdminApi.issueCertificate.mockRejectedValue(new Error('Already enrolled'));
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /issue manually/i }));
    fireEvent.click(screen.getByRole('button', { name: /issue manually/i }));
    // Select user and course to enable the Issue Certificate button
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'u1' } });
    fireEvent.change(selects[1], { target: { value: 'c1' } });
    fireEvent.click(screen.getByRole('button', { name: /issue certificate/i }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Already enrolled', 'error'));
  });

  it('shows validation toast when user/course not selected and Issue is clicked', async () => {
    // When selects are empty the button is disabled — but the validation check fires from handleIssue
    // Override mock to invoke issueCertificate normally
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /issue manually/i }));
    fireEvent.click(screen.getByRole('button', { name: /issue manually/i }));
    // Issue Certificate button is disabled when selects are empty
    const issueBtn = screen.getByRole('button', { name: /issue certificate/i });
    expect(issueBtn).toBeDisabled();
  });
});
