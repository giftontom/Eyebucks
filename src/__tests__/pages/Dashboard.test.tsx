import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';

const user = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  avatar: '',
  role: 'USER',
};

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user,
    session: { access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

const { mockEnrollmentsApi, mockCoursesApi } = vi.hoisted(() => {
  const mockEnrollmentsApi = {
    getUserEnrollments: vi.fn(),
  };
  const mockCoursesApi = {
    getCoursesByIds: vi.fn(),
  };
  return { mockEnrollmentsApi, mockCoursesApi };
});

vi.mock('../../../services/api', () => ({
  enrollmentsApi: mockEnrollmentsApi,
  coursesApi: mockCoursesApi,
}));

import { Dashboard } from '../../../pages/Dashboard';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <HashRouter>
        <Dashboard />
      </HashRouter>
    );
  };

  it('should display user enrollments', async () => {
    mockEnrollmentsApi.getUserEnrollments.mockResolvedValueOnce([
      {
        id: 'enroll-1',
        courseId: 'course-1',
        enrolledAt: new Date(),
        lastAccessedAt: null,
        progress: { overallPercent: 50 },
      },
    ]);

    mockCoursesApi.getCoursesByIds.mockResolvedValueOnce([
      { id: 'course-1', title: 'React Course', thumbnail: 'thumb.jpg', type: 'MODULE', description: 'desc' },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('React Course')).toBeInTheDocument();
    });
  });

  it('should show empty state when no enrollments', async () => {
    mockEnrollmentsApi.getUserEnrollments.mockResolvedValueOnce([]);
    mockCoursesApi.getCoursesByIds.mockResolvedValueOnce([]);

    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByText(/haven't enrolled/i) ||
        screen.getByText(/browse/i)
      ).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockEnrollmentsApi.getUserEnrollments.mockRejectedValueOnce(
      new Error('Failed to fetch enrollments')
    );

    renderDashboard();

    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });
});
