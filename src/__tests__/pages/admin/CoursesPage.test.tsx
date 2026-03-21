import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminApi, mockShowToast, mockRefreshCourses } = vi.hoisted(() => ({
  mockAdminApi: {
    getCourses: vi.fn(),
    publishCourse: vi.fn(),
    deleteCourse: vi.fn(),
    restoreCourse: vi.fn(),
    getCourseAnalytics: vi.fn(),
  },
  mockShowToast: vi.fn(),
  mockRefreshCourses: vi.fn(),
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockAdminApi }));

vi.mock('../../../../pages/admin/AdminContext', () => ({
  useAdmin: () => ({ showToast: mockShowToast, refreshCourses: mockRefreshCourses }),
}));

vi.mock('../../../../pages/admin/hooks/useAdminData', () => ({
  useAdminData: ({ fetchFn }: { fetchFn: () => Promise<any> }) => {
    const [data, setData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
      fetchFn().then((d: any) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    }, []);
    return { data, loading, refetch: vi.fn() };
  },
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

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { CoursesPage } from '../../../../pages/admin/CoursesPage';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockCourse = {
  id: 'c1',
  title: 'React Fundamentals',
  slug: 'react-fundamentals',
  type: 'MODULE',
  status: 'PUBLISHED',
  price: 99900,
  rating: 4.5,
  totalStudents: 100,
  totalRevenue: 0,
  thumbnail: '',
  deletedAt: null,
};

const mockArchivedCourse = {
  ...mockCourse,
  id: 'c2',
  title: 'Old Course',
  status: 'DRAFT',
  deletedAt: '2026-01-01T00:00:00Z',
};

function renderPage() {
  return render(<CoursesPage />);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminApi.getCourses.mockResolvedValue({ courses: [mockCourse] });
  mockAdminApi.publishCourse.mockResolvedValue({ success: true });
  mockAdminApi.deleteCourse.mockResolvedValue({ success: true });
  mockAdminApi.restoreCourse.mockResolvedValue({ success: true });
  mockAdminApi.getCourseAnalytics.mockResolvedValue({ analytics: { totalEnrollments: 50, completionRate: 70, avgWatchTimeMinutes: 30, revenueTotal: 99900, activeStudents30d: 20 } });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CoursesPage', () => {

  it('renders course title in table after loading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('React Fundamentals')).toBeInTheDocument());
  });

  it('shows "No courses found" when list is empty', async () => {
    mockAdminApi.getCourses.mockResolvedValue({ courses: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText('No courses found')).toBeInTheDocument());
  });

  it('calls publishCourse and shows success toast when Unpublish is confirmed', async () => {
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    // First click opens the confirm dialog; both buttons now show "Unpublish"
    const btns = screen.getAllByRole('button', { name: 'Unpublish' });
    fireEvent.click(btns[0]); // opens dialog
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Unpublish' }).length).toBe(2));
    // Click the confirm button (second one, inside the dialog)
    fireEvent.click(screen.getAllByRole('button', { name: 'Unpublish' })[1]);
    await waitFor(() => expect(mockAdminApi.publishCourse).toHaveBeenCalledWith('c1', 'DRAFT'));
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('successfully'), 'success');
  });

  it('opens archive confirm dialog when Archive is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(screen.getByRole('dialog', { name: /archive course/i })).toBeInTheDocument();
  });

  it('calls deleteCourse and shows success toast when archive confirmed', async () => {
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive Course' }));
    await waitFor(() => expect(mockAdminApi.deleteCourse).toHaveBeenCalledWith('c1'));
    expect(mockShowToast).toHaveBeenCalledWith('Course archived!', 'success');
  });

  it('shows error toast when publishCourse fails', async () => {
    mockAdminApi.publishCourse.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Unpublish' })[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Unpublish' }).length).toBe(2));
    fireEvent.click(screen.getAllByRole('button', { name: 'Unpublish' })[1]);
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Network error', 'error'));
  });

  it('shows Restore button for archived courses and calls restoreCourse on confirm', async () => {
    // Load both active and archived courses; filter toggle shows/hides them
    mockAdminApi.getCourses.mockResolvedValue({ courses: [mockCourse, mockArchivedCourse] });
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    // Toggle to show archived courses (hides active, shows archived)
    fireEvent.click(screen.getByRole('button', { name: /show archived/i }));
    await waitFor(() => expect(screen.getByText('Old Course')).toBeInTheDocument());
    // Restore button for archived course
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));
    // ConfirmDialog confirm button has label "Restore"
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Restore' }).length).toBeGreaterThan(1));
    fireEvent.click(screen.getAllByRole('button', { name: 'Restore' }).slice(-1)[0]);
    await waitFor(() => expect(mockAdminApi.restoreCourse).toHaveBeenCalledWith('c2'));
    expect(mockShowToast).toHaveBeenCalledWith('Course restored!', 'success');
  });

  it('shows error toast when archiving fails', async () => {
    mockAdminApi.deleteCourse.mockRejectedValue(new Error('Delete failed'));
    renderPage();
    await waitFor(() => screen.getByText('React Fundamentals'));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive Course' }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Delete failed', 'error'));
  });
});
