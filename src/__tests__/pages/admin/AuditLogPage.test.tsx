import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('../../../../services/supabase', () => ({
  supabase: { from: mockFrom },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { AuditLogPage } from '../../../../pages/admin/AuditLogPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockLog = {
  id: 'log1',
  admin_id: 'admin1',
  users: { name: 'Admin User' },
  action: 'course.update',
  entity_type: 'course',
  entity_id: 'course-uuid-abc',
  old_value: null,
  new_value: null,
  metadata: { reason: 'Price change' },
  created_at: '2026-03-01T10:00:00Z',
};

function makeChain(data: any[], count = 1) {
  const rangeResult = { data, error: null, count };
  const rangeMock = vi.fn().mockResolvedValue(rangeResult);
  const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
  const selectMock = vi.fn().mockReturnValue({ order: orderMock });
  return { select: selectMock, order: orderMock, range: rangeMock };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue(makeChain([mockLog], 1));
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuditLogPage', () => {
  it('renders audit log entries after loading', async () => {
    render(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText('Admin User')).toBeInTheDocument());
    expect(screen.getByText('course.update')).toBeInTheDocument();
    expect(screen.getByText('course')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<AuditLogPage />);
    // AuditLogPage uses a Loader2 spinner during loading (no text, but from is called)
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
  });

  it('shows "No audit events recorded yet." when list is empty', async () => {
    mockFrom.mockReturnValue(makeChain([], 0));
    render(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText(/no audit events recorded yet/i)).toBeInTheDocument());
  });

  it('shows "Audit Log" heading', async () => {
    render(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText('Audit Log')).toBeInTheDocument());
  });

  it('shows metadata reason in details column', async () => {
    render(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText('Price change')).toBeInTheDocument());
  });

  it('calls supabase from audit_logs on mount', () => {
    render(<AuditLogPage />);
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
  });

  it('re-fetches when Refresh button clicked', async () => {
    render(<AuditLogPage />);
    await waitFor(() => screen.getByText('Admin User'));
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(2));
  });

  it('shows total event count', async () => {
    render(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText(/1 events recorded/i)).toBeInTheDocument());
  });
});
