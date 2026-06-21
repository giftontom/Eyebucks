import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    getCourses: vi.fn(),
  };
  return { mockEnrollmentsApi, mockCoursesApi };
});

vi.mock('../../../services/api', () => ({
  enrollmentsApi: mockEnrollmentsApi,
  coursesApi: mockCoursesApi,
}));

vi.mock('../../../hooks/useWishlist', () => ({
  useWishlist: () => ({ wishlistIds: [], isSaved: false, toggle: vi.fn(), isLoading: false }),
}));

vi.mock('../../../services/api/wishlist.api', () => ({
  wishlistApi: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { Dashboard } from '../../../pages/Dashboard';

const makeEnrollment = (overrides = {}) => ({
  id: 'enroll-1',
  courseId: 'course-1',
  enrolledAt: new Date(),
  lastAccessedAt: null,
  progress: { overallPercent: 50 },
  ...overrides,
});

const makeCourse = (overrides = {}) => ({
  id: 'course-1',
  title: 'React Course',
  thumbnail: 'thumb.jpg',
  type: 'MODULE',
  description: 'desc',
  price: 99900,
  ...overrides,
});

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCoursesApi.getCourses.mockResolvedValue({ courses: [] });
  });

  const renderDashboard = () => {
    return render(
      <HashRouter>
        <Dashboard />
      </HashRouter>
    );
  };

  it('should display user enrollments', async () => {
    mockEnrollmentsApi.getUserEnrollments.mockResolvedValueOnce([makeEnrollment()]);
    mockCoursesApi.getCoursesByIds.mockResolvedValueOnce([makeCourse()]);

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
      expect(screen.getByText(/no courses yet/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockEnrollmentsApi.getUserEnrollments.mockRejectedValueOnce(
      new Error('Failed to fetch enrollments')
    );

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/failed to load your courses/i)).toBeInTheDocument();
    });
  });

  // --- A11 gap tests ---

  it('shows progress percentage for enrolled courses', async () => {
    mockEnrollmentsApi.getUserEnrollments.mockResolvedValueOnce([
      makeEnrollment({ progress: { overallPercent: 75 } }),
    ]);
    mockCoursesApi.getCoursesByIds.mockResolvedValueOnce([makeCourse()]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('75% Completed')).toBeInTheDocument();
    });
  });

  it('shows "Browse Catalog" CTA when no enrollments', async () => {
    mockEnrollmentsApi.getUserEnrollments.mockResolvedValueOnce([]);
    mockCoursesApi.getCoursesByIds.mockResolvedValueOnce([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/browse catalog/i)).toBeInTheDocument();
    });
  });

  it('renders multiple enrolled courses', async () => {
    mockEnrollmentsApi.getUserEnrollments.mockResolvedValueOnce([
      makeEnrollment({ id: 'e1', courseId: 'c1', progress: { overallPercent: 30 } }),
      makeEnrollment({ id: 'e2', courseId: 'c2', progress: { overallPercent: 100 } }),
    ]);
    mockCoursesApi.getCoursesByIds.mockResolvedValueOnce([
      makeCourse({ id: 'c1', title: 'Course A' }),
      makeCourse({ id: 'c2', title: 'Course B' }),
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Course A')).toBeInTheDocument();
      expect(screen.getByText('Course B')).toBeInTheDocument();
    });
  });

  it('shows correct CTA label based on progress', async () => {
    mockEnrollmentsApi.getUserEnrollments.mockResolvedValueOnce([
      makeEnrollment({ id: 'e1', courseId: 'c1', progress: { overallPercent: 0 } }),
      makeEnrollment({ id: 'e2', courseId: 'c2', progress: { overallPercent: 50 } }),
      makeEnrollment({ id: 'e3', courseId: 'c3', progress: { overallPercent: 100 } }),
    ]);
    mockCoursesApi.getCoursesByIds.mockResolvedValueOnce([
      makeCourse({ id: 'c1', title: 'Not Started' }),
      makeCourse({ id: 'c2', title: 'In Progress' }),
      makeCourse({ id: 'c3', title: 'Done' }),
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Start Learning')).toBeInTheDocument();
      expect(screen.getByText('Continue Learning')).toBeInTheDocument();
      expect(screen.getByText('Review Course')).toBeInTheDocument();
    });
  });

  it('shows welcome message with user name', async () => {
    mockEnrollmentsApi.getUserEnrollments.mockResolvedValueOnce([]);
    mockCoursesApi.getCoursesByIds.mockResolvedValueOnce([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/welcome back, test user/i)).toBeInTheDocument();
    });
  });
});
